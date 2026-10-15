//! Translation of chat text through a translation model: the composer into the
//! language the user wants to send, assistant replies into the language they
//! want to read. The agent's own input and output are never changed — this is a
//! separate layer the frontend applies on top.
//!
//! Engines: Alibaba Bailian qwen-mt (default qwen-mt-flash) and Tencent
//! TokenHub hy-mt2. Measured 2026-10-15 from a mainland connection, a paragraph
//! took ~0.5s on qwen-mt-flash and ~1.3s on hy-mt2-plus.
//!
//! One call: look every text up in the cache, pack the rest into batches
//! ([`batch`]) — the paragraphs of one reply in one batch, so they are
//! translated in each other's context — send each through the per-model pacing
//! ([`limiter`]) and down the fallback chain, check each translation kept its
//! placeholders and code spans (retrying a damaged one on its own), and cache
//! what passed.

pub mod batch;
mod client;
pub mod credentials;
pub mod error;
pub mod glossary;
pub mod languages;
pub mod limiter;
pub mod providers;

use std::sync::atomic::{AtomicBool, Ordering};

use futures::future::join_all;
use sea_orm::DatabaseConnection;

use crate::commands::config_sync::snapshot::sha256_hex;
use crate::db::service::translation_cache_service;
use crate::models::translation::{
    TranslateRequest, TranslateResult, TranslationProvider, TranslationSettings,
};

use credentials::ApiKeys;
pub use error::TranslateError;
use languages::Language;
use providers::{Engine, EngineRequest};

const QWEN_MT_LITE: &str = "qwen-mt-lite";

/// The engines to try, in order. The first is the user's choice and must have a
/// key; the rest are added only when fallback is on and they can be used.
pub fn engine_chain(
    settings: &TranslationSettings,
    keys: &ApiKeys,
) -> Result<Vec<Engine>, TranslateError> {
    let engine = |provider: TranslationProvider, model: &str| Engine {
        provider,
        model: model.to_string(),
        base_url: match provider {
            TranslationProvider::Dashscope => settings.dashscope_base_url.clone(),
            TranslationProvider::Tokenhub => settings.tokenhub_base_url.clone(),
        },
        api_key: keys.get(provider).to_string(),
    };
    let model_of = |provider: TranslationProvider| match provider {
        TranslationProvider::Dashscope => settings.dashscope_model.as_str(),
        TranslationProvider::Tokenhub => settings.tokenhub_model.as_str(),
    };

    let primary = settings.provider;
    if keys.get(primary).is_empty() {
        return Err(TranslateError::MissingKey {
            provider: provider_name(primary),
        });
    }
    let mut chain = vec![engine(primary, model_of(primary))];
    if settings.fallback_enabled {
        // qwen-mt-lite has its own quota, so it absorbs a rate limit on flash.
        if primary == TranslationProvider::Dashscope && model_of(primary) != QWEN_MT_LITE {
            chain.push(engine(primary, QWEN_MT_LITE));
        }
        let other = match primary {
            TranslationProvider::Dashscope => TranslationProvider::Tokenhub,
            TranslationProvider::Tokenhub => TranslationProvider::Dashscope,
        };
        if !keys.get(other).is_empty() {
            chain.push(engine(other, model_of(other)));
        }
    }
    Ok(chain)
}

pub fn provider_name(provider: TranslationProvider) -> &'static str {
    match provider {
        TranslationProvider::Dashscope => "dashscope",
        TranslationProvider::Tokenhub => "tokenhub",
    }
}

/// The cache is engine-independent on purpose: a translation stays valid when
/// the user switches models, and settings offer a button to clear it.
///
/// `v2`: replies are translated whole since 2026-10-15, each paragraph in the
/// context of the rest. `v1` entries were translated paragraph by paragraph —
/// the same name came out two ways in one reply — and are not reused; they
/// age out with the rest of the cache.
pub fn cache_key(
    source: Option<&Language>,
    target: &Language,
    glossary_fingerprint: &str,
    text: &str,
) -> String {
    sha256_hex(
        format!(
            "v2\u{1f}{}\u{1f}{}\u{1f}{}\u{1f}{}",
            source.map_or("auto", |l| l.code),
            target.code,
            glossary_fingerprint,
            text
        )
        .as_bytes(),
    )
}

fn resolve_languages(
    req: &TranslateRequest,
) -> Result<(Option<&'static Language>, &'static Language), TranslateError> {
    let target = languages::find(&req.target)
        .ok_or_else(|| TranslateError::UnsupportedLanguage(req.target.clone()))?;
    let source = match req.source.as_deref() {
        None | Some("") | Some("auto") => None,
        Some(code) => Some(
            languages::find(code)
                .ok_or_else(|| TranslateError::UnsupportedLanguage(code.to_string()))?,
        ),
    };
    Ok((source, target))
}

/// Prune the cache once per process, on first use rather than at startup so
/// nothing is added to the launch path.
static PRUNED: AtomicBool = AtomicBool::new(false);

async fn prune_once(conn: &DatabaseConnection) {
    if !PRUNED.swap(true, Ordering::SeqCst) {
        if let Err(err) = translation_cache_service::prune(conn).await {
            tracing::warn!("[TRANSLATION] cache prune failed: {err}");
        }
    }
}

pub async fn translate_texts(
    conn: &DatabaseConnection,
    settings: &TranslationSettings,
    keys: &ApiKeys,
    req: TranslateRequest,
) -> Result<TranslateResult, TranslateError> {
    let (source, target) = resolve_languages(&req)?;
    let chain = engine_chain(settings, keys)?;
    let clients = client::clients().map_err(|message| TranslateError::Network {
        model: chain[0].model.clone(),
        message,
    })?;
    prune_once(conn).await;

    let fingerprint = glossary::fingerprint(&settings.glossary);
    let cache_keys: Vec<String> = req
        .texts
        .iter()
        .map(|t| cache_key(source, target, &fingerprint, t))
        .collect();
    let cached = translation_cache_service::get_many(conn, &cache_keys).await?;

    let mut translations: Vec<Option<String>> = vec![None; req.texts.len()];
    let mut pending: Vec<usize> = Vec::new();
    for (i, text) in req.texts.iter().enumerate() {
        if text.trim().is_empty() {
            translations[i] = Some(text.clone());
        } else if let Some(hit) = cached.get(&cache_keys[i]) {
            translations[i] = Some(hit.clone());
        } else {
            pending.push(i);
        }
    }
    if pending.is_empty() {
        return Ok(TranslateResult {
            translations,
            model: None,
        });
    }

    let pending_texts: Vec<String> = pending.iter().map(|&i| req.texts[i].clone()).collect();
    // No groups: the whole request belongs together.
    let pending_groups: Vec<u32> = pending
        .iter()
        .map(|&i| {
            req.groups
                .as_ref()
                .and_then(|groups| groups.get(i).copied())
                .unwrap_or(0)
        })
        .collect();
    let batches = batch::plan_batches(&pending_texts, &pending_groups);
    let ctx = Ctx {
        clients: &clients,
        chain: &chain,
        source,
        target,
        glossary: &settings.glossary,
    };
    let results = join_all(batches.iter().map(|indices| {
        let texts: Vec<&str> = indices.iter().map(|&k| pending_texts[k].as_str()).collect();
        let ctx = &ctx;
        async move { ctx.translate_batch(&texts).await }
    }))
    .await;

    let mut model = None;
    let mut first_error = None;
    let mut fresh: Vec<(String, String)> = Vec::new();
    for (indices, result) in batches.iter().zip(results) {
        match result {
            Ok((outputs, used)) => {
                model = Some(used);
                for (&k, output) in indices.iter().zip(outputs) {
                    let i = pending[k];
                    if let Some(text) = &output {
                        fresh.push((cache_keys[i].clone(), text.clone()));
                    }
                    translations[i] = output;
                }
            }
            Err(err) => {
                tracing::warn!("[TRANSLATION] batch failed: {err}");
                first_error.get_or_insert(err);
            }
        }
    }
    // Every batch failed: report why. A partial failure leaves those segments
    // `None`, which the caller shows untranslated.
    if model.is_none() {
        if let Some(err) = first_error {
            return Err(err);
        }
    }
    if !fresh.is_empty() {
        if let Err(err) = translation_cache_service::put_many(conn, fresh).await {
            tracing::warn!("[TRANSLATION] cache write failed: {err}");
        }
    }
    Ok(TranslateResult {
        translations,
        model,
    })
}

/// Translate one sample through one engine, no cache and no fallback, for the
/// settings page's test button. Returns the model and the translation.
pub async fn translate_sample(
    settings: &TranslationSettings,
    engine: &Engine,
    text: &str,
    target: &'static Language,
) -> Result<String, TranslateError> {
    let clients = client::clients().map_err(|message| TranslateError::Network {
        model: engine.model.clone(),
        message,
    })?;
    let terms = glossary::terms_for(&[text.to_string()], &settings.glossary, target.code);
    let _permit = limiter::for_model(&engine.limiter_key()).acquire().await;
    providers::translate(
        &clients,
        engine,
        &EngineRequest {
            text,
            source: None,
            target,
            terms: &terms,
        },
    )
    .await
}

struct Ctx<'a> {
    clients: &'a client::Clients,
    chain: &'a [Engine],
    source: Option<&'static Language>,
    target: &'static Language,
    glossary: &'a [crate::models::translation::GlossaryEntry],
}

impl Ctx<'_> {
    /// One batch: the packed request, then any segment that came back missing
    /// or damaged on its own. Returns one entry per text and the model used.
    async fn translate_batch(
        &self,
        texts: &[&str],
    ) -> Result<(Vec<Option<String>>, String), TranslateError> {
        let (answer, model) = self.call(&batch::pack(texts), texts).await?;
        let mut outputs: Vec<Option<String>> = match batch::unpack(&answer, texts.len()) {
            Some(parts) => texts
                .iter()
                .zip(parts)
                .map(|(src, out)| batch::is_faithful(src, &out).then_some(out))
                .collect(),
            None => vec![None; texts.len()],
        };
        if texts.len() > 1 {
            let retries: Vec<usize> = (0..texts.len()).filter(|&i| outputs[i].is_none()).collect();
            let retried = join_all(retries.iter().map(|&i| async move {
                match self.call(texts[i], &texts[i..=i]).await {
                    Ok((out, _)) => batch::is_faithful(texts[i], &out).then_some(out),
                    Err(err) => {
                        tracing::warn!("[TRANSLATION] segment retry failed: {err}");
                        None
                    }
                }
            }))
            .await;
            for (i, out) in retries.into_iter().zip(retried) {
                outputs[i] = out;
            }
        }
        Ok((outputs, model))
    }

    /// Send one request down the chain: the next engine is tried only after a
    /// transient failure (rate limit, outage, garbage), never after a rejected
    /// key or request, which the user has to see.
    async fn call(&self, text: &str, texts: &[&str]) -> Result<(String, String), TranslateError> {
        let owned: Vec<String> = texts.iter().map(|t| t.to_string()).collect();
        let terms = glossary::terms_for(&owned, self.glossary, self.target.code);
        let mut last_error = None;
        for (i, engine) in self.chain.iter().enumerate() {
            let _permit = limiter::for_model(&engine.limiter_key()).acquire().await;
            let result = providers::translate(
                self.clients,
                engine,
                &EngineRequest {
                    text,
                    source: self.source,
                    target: self.target,
                    terms: &terms,
                },
            )
            .await;
            match result {
                Ok(answer) => return Ok((answer, engine.model.clone())),
                Err(err) if err.is_transient() && i + 1 < self.chain.len() => {
                    tracing::warn!(
                        "[TRANSLATION] {} failed, trying the next engine: {err}",
                        engine.model
                    );
                    last_error = Some(err);
                }
                Err(err) => return Err(err),
            }
        }
        Err(last_error.expect("the chain is never empty"))
    }
}

#[cfg(test)]
mod tests;

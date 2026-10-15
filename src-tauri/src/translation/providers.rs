//! Request and response shapes of the two engines. Both speak OpenAI chat
//! completions; they differ in where the instruction goes.
//!
//! * qwen-mt (Bailian) takes the text alone as the single user message — it
//!   accepts no system message — and the languages and glossary in a
//!   non-standard `translation_options` field.
//! * hy-mt2 (TokenHub) takes everything in the prompt, using the templates from
//!   Tencent's guide: an optional "参考下面的翻译" block of term pairs, then
//!   the instruction, then the text.
//!
//! Requests are not streamed: the caller shows a segment once it is complete,
//! and a whole short segment arrives in about the time streaming would take.

use std::time::Duration;

use serde_json::{json, Value};

use crate::models::translation::TranslationProvider;

use super::client::{self, Clients};
use super::error::TranslateError;
use super::glossary::Term;
use super::languages::Language;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Engine {
    pub provider: TranslationProvider,
    pub model: String,
    pub base_url: String,
    pub api_key: String,
}

impl Engine {
    /// Key for [`super::limiter::for_model`].
    pub fn limiter_key(&self) -> String {
        format!("{:?}/{}", self.provider, self.model)
    }
}

pub struct EngineRequest<'a> {
    pub text: &'a str,
    pub source: Option<&'static Language>,
    pub target: &'static Language,
    pub terms: &'a [Term],
}

pub fn build_body(engine: &Engine, req: &EngineRequest<'_>) -> Value {
    match engine.provider {
        TranslationProvider::Dashscope => {
            let mut options = json!({
                "source_lang": req.source.map_or("auto", |l| l.english),
                "target_lang": req.target.english,
            });
            if !req.terms.is_empty() {
                options["terms"] = req
                    .terms
                    .iter()
                    .map(|t| json!({ "source": t.source, "target": t.target }))
                    .collect();
            }
            json!({
                "model": engine.model,
                "messages": [{ "role": "user", "content": req.text }],
                "translation_options": options,
            })
        }
        TranslationProvider::Tokenhub => {
            let mut prompt = String::new();
            if !req.terms.is_empty() {
                prompt.push_str("参考下面的翻译：\n");
                for term in req.terms {
                    prompt.push_str(&format!("{} 翻译成 {}\n", term.source, term.target));
                }
                prompt.push('\n');
            }
            prompt.push_str(&format!(
                "将以下文本翻译为{}，注意只需要输出翻译后的结果，不要额外解释：\n\n{}",
                req.target.chinese, req.text
            ));
            json!({
                "model": engine.model,
                "messages": [{ "role": "user", "content": prompt }],
            })
        }
    }
}

pub async fn translate(
    clients: &Clients,
    engine: &Engine,
    req: &EngineRequest<'_>,
) -> Result<String, TranslateError> {
    let url = format!("{}/chat/completions", engine.base_url.trim_end_matches('/'));
    let network = |e: reqwest::Error| TranslateError::Network {
        model: engine.model.clone(),
        message: e.to_string(),
    };
    let body = build_body(engine, req);
    let response = client::send(clients, |client| {
        client
            .post(&url)
            .bearer_auth(&engine.api_key)
            .json(&body)
    })
    .await
    .map_err(network)?;

    let status = response.status();
    let retry_after = response
        .headers()
        .get(reqwest::header::RETRY_AFTER)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.trim().parse::<u64>().ok())
        .map(Duration::from_secs);
    let body = response.text().await.map_err(network)?;

    if !status.is_success() {
        let model = engine.model.clone();
        let code = status.as_u16();
        let message = error_message(&body);
        return Err(match code {
            401 | 403 => TranslateError::Auth {
                model,
                status: code,
            },
            429 => TranslateError::RateLimited { model, retry_after },
            400..=499 => TranslateError::Rejected {
                model,
                status: code,
                message,
            },
            _ => TranslateError::Server {
                model,
                status: code,
                message,
            },
        });
    }

    parse_content(&body).ok_or_else(|| TranslateError::BadResponse {
        model: engine.model.clone(),
        message: truncate(&body, 300),
    })
}

fn parse_content(body: &str) -> Option<String> {
    let value: Value = serde_json::from_str(body).ok()?;
    let content = value
        .pointer("/choices/0/message/content")?
        .as_str()?
        .trim()
        .to_string();
    Some(content)
}

/// The engine's own words for what went wrong: OpenAI-style `error.message`,
/// Bailian's top-level `message`, or the raw body.
fn error_message(body: &str) -> String {
    let parsed: Option<Value> = serde_json::from_str(body).ok();
    parsed
        .as_ref()
        .and_then(|v| {
            v.pointer("/error/message")
                .or_else(|| v.get("message"))
                .and_then(Value::as_str)
        })
        .map(|s| truncate(s, 300))
        .unwrap_or_else(|| truncate(body.trim(), 300))
}

fn truncate(text: &str, cap: usize) -> String {
    if text.chars().count() <= cap {
        text.to_string()
    } else {
        text.chars().take(cap).collect::<String>() + "…"
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::translation::languages::find;

    pub(crate) fn engine(provider: TranslationProvider, base_url: &str) -> Engine {
        Engine {
            provider,
            model: match provider {
                TranslationProvider::Dashscope => "qwen-mt-flash".into(),
                TranslationProvider::Tokenhub => "hy-mt2-plus".into(),
            },
            base_url: base_url.into(),
            api_key: "sk-test".into(),
        }
    }

    #[test]
    fn qwen_gets_the_text_alone_and_languages_in_translation_options() {
        let terms = [Term {
            source: "agent".into(),
            target: "智能体".into(),
        }];
        let body = build_body(
            &engine(TranslationProvider::Dashscope, "x"),
            &EngineRequest {
                text: "Ask the agent.",
                source: None,
                target: find("zh-CN").unwrap(),
                terms: &terms,
            },
        );
        assert_eq!(body["model"], "qwen-mt-flash");
        assert_eq!(body["messages"].as_array().unwrap().len(), 1);
        assert_eq!(body["messages"][0]["role"], "user");
        assert_eq!(body["messages"][0]["content"], "Ask the agent.");
        assert_eq!(body["translation_options"]["source_lang"], "auto");
        assert_eq!(body["translation_options"]["target_lang"], "Chinese");
        assert_eq!(body["translation_options"]["terms"][0]["target"], "智能体");
        assert!(body.get("stream").is_none());
    }

    #[test]
    fn qwen_omits_terms_when_there_are_none() {
        let body = build_body(
            &engine(TranslationProvider::Dashscope, "x"),
            &EngineRequest {
                text: "Hi",
                source: find("en"),
                target: find("ja").unwrap(),
                terms: &[],
            },
        );
        assert_eq!(body["translation_options"]["source_lang"], "English");
        assert!(body["translation_options"].get("terms").is_none());
    }

    #[test]
    fn hy_gets_the_instruction_and_terms_in_the_prompt() {
        let terms = [Term {
            source: "智能体".into(),
            target: "agent".into(),
        }];
        let body = build_body(
            &engine(TranslationProvider::Tokenhub, "x"),
            &EngineRequest {
                text: "让智能体重试",
                source: None,
                target: find("en").unwrap(),
                terms: &terms,
            },
        );
        assert_eq!(
            body["messages"][0]["content"],
            "参考下面的翻译：\n智能体 翻译成 agent\n\n将以下文本翻译为英语，注意只需要输出翻译后的结果，不要额外解释：\n\n让智能体重试"
        );
        assert!(body.get("translation_options").is_none());
    }

    #[test]
    fn content_and_error_messages_are_extracted() {
        assert_eq!(
            parse_content(r#"{"choices":[{"message":{"content":" 你好\n"}}]}"#),
            Some("你好".into())
        );
        assert_eq!(parse_content(r#"{"choices":[]}"#), None);
        assert_eq!(
            error_message(r#"{"error":{"message":"Invalid model"}}"#),
            "Invalid model"
        );
        assert_eq!(
            error_message(r#"{"code":"x","message":"Throttled"}"#),
            "Throttled"
        );
        assert_eq!(error_message("bad gateway"), "bad gateway");
    }
}

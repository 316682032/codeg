//! Translation settings and the translate calls. See `crate::translation` for
//! how a call is carried out.
//!
//! Settings live in one `app_metadata` row; the two API keys live in the OS
//! keyring (`translation::credentials`) and only their presence travels to the
//! frontend. A save broadcasts the view on `translation-settings://changed`, so
//! conversation windows pick up a change made in the settings window.

use sea_orm::DatabaseConnection;

#[cfg(feature = "tauri-runtime")]
use tauri::State;

use crate::app_error::AppCommandError;
use crate::commands::config_sync::snapshot::sha256_hex;
use crate::db::service::{
    app_metadata_service, translation_cache_service, translation_original_service,
};
use crate::db::AppDatabase;
use crate::models::translation::{
    GlossaryEntry, TranslateRequest, TranslateResult, TranslationProvider, TranslationSettings,
    TranslationSettingsInput, TranslationSettingsView, TranslationTestResult,
    DEFAULT_DASHSCOPE_BASE_URL, DEFAULT_DASHSCOPE_MODEL, DEFAULT_TOKENHUB_BASE_URL,
    DEFAULT_TOKENHUB_MODEL,
};
use crate::translation::credentials::{self, DASHSCOPE_API_KEY, TOKENHUB_API_KEY};
use crate::translation::{self, languages, providers::Engine, TranslateError};
use crate::web::event_bridge::{emit_event, EventEmitter, TRANSLATION_SETTINGS_CHANGED_EVENT};

pub const KEY_TRANSLATION_SETTINGS: &str = "translation_settings";

/// The sentence the settings page's test button translates: short, technical,
/// and one the engines differ on (hy-mt2-lite rendered "composer" as 作曲家).
const TEST_SAMPLE: &str =
    "I fixed the flicker: the editor now keeps its state when you switch modes.";

/// Saves run one at a time from the write through the broadcast, so the last
/// broadcast every client keeps is the last write (see `conversation_tags`).
static SAVE_LOCK: std::sync::LazyLock<tokio::sync::Mutex<()>> =
    std::sync::LazyLock::new(|| tokio::sync::Mutex::new(()));

/// Missing or malformed reads as the defaults: corrupt persistence is "no
/// preference yet", never a hard error.
pub async fn load_translation_settings(conn: &DatabaseConnection) -> TranslationSettings {
    let raw = match app_metadata_service::get_value(conn, KEY_TRANSLATION_SETTINGS).await {
        Ok(Some(raw)) => raw,
        Ok(None) => return TranslationSettings::default(),
        Err(err) => {
            tracing::warn!("[TRANSLATION] failed to read settings: {err}");
            return TranslationSettings::default();
        }
    };
    match serde_json::from_str::<TranslationSettings>(&raw) {
        Ok(settings) => normalize(settings),
        Err(err) => {
            tracing::warn!("[TRANSLATION] failed to parse settings: {err}");
            TranslationSettings::default()
        }
    }
}

/// Blank fields fall back to their defaults, unknown languages to the default
/// language, and the glossary loses blank and duplicate entries.
fn normalize(mut s: TranslationSettings) -> TranslationSettings {
    fn or_default(value: &str, default: &str) -> String {
        let trimmed = value.trim().trim_end_matches('/');
        if trimmed.is_empty() {
            default.to_string()
        } else {
            trimmed.to_string()
        }
    }
    s.dashscope_model = or_default(&s.dashscope_model, DEFAULT_DASHSCOPE_MODEL);
    s.tokenhub_model = or_default(&s.tokenhub_model, DEFAULT_TOKENHUB_MODEL);
    s.dashscope_base_url = or_default(&s.dashscope_base_url, DEFAULT_DASHSCOPE_BASE_URL);
    s.tokenhub_base_url = or_default(&s.tokenhub_base_url, DEFAULT_TOKENHUB_BASE_URL);
    s.output_target = s
        .output_target
        .and_then(|code| languages::find(&code).map(|l| l.code.to_string()));
    s.input_target = languages::find(&s.input_target)
        .map(|l| l.code.to_string())
        .unwrap_or_else(|| "en".to_string());
    let mut glossary: Vec<GlossaryEntry> = Vec::new();
    for entry in s.glossary {
        let source = entry.source.trim().to_string();
        // An empty translation means "keep it as written": the engine is told
        // to translate the term as itself.
        let target = match entry.target.trim() {
            "" => source.clone(),
            target => target.to_string(),
        };
        if !source.is_empty() && !glossary.iter().any(|e| e.source == source) {
            glossary.push(GlossaryEntry { source, target });
        }
    }
    s.glossary = glossary;
    s
}

/// A keyring that will not open reads as "no key" here: the view only drives
/// what the page shows, and a save never deletes a key it was not told to, so
/// the worst case is a prompt to enter a key that is in fact stored.
fn view(settings: TranslationSettings) -> TranslationSettingsView {
    let has = |name: &str| {
        credentials::is_stored(name).unwrap_or_else(|err| {
            tracing::warn!("[TRANSLATION] could not check the stored key: {err}");
            false
        })
    };
    TranslationSettingsView {
        settings,
        has_dashscope_key: has(DASHSCOPE_API_KEY),
        has_tokenhub_key: has(TOKENHUB_API_KEY),
    }
}

pub async fn get_translation_settings_core(
    db: &AppDatabase,
) -> Result<TranslationSettingsView, AppCommandError> {
    Ok(view(load_translation_settings(&db.conn).await))
}

/// Keys first, then the row: a key that failed to store aborts the save before
/// the row claims a configuration that cannot work.
pub async fn save_translation_settings_core(
    emitter: &EventEmitter,
    db: &AppDatabase,
    input: TranslationSettingsInput,
) -> Result<TranslationSettingsView, AppCommandError> {
    let _one_at_a_time = SAVE_LOCK.lock().await;
    if let Some(key) = &input.dashscope_api_key {
        credentials::store(DASHSCOPE_API_KEY, key.trim())?;
    }
    if let Some(key) = &input.tokenhub_api_key {
        credentials::store(TOKENHUB_API_KEY, key.trim())?;
    }
    let settings = normalize(input.settings);
    let raw = serde_json::to_string(&settings).map_err(|e| {
        AppCommandError::invalid_input("Invalid translation settings").with_detail(e.to_string())
    })?;
    app_metadata_service::upsert_value(&db.conn, KEY_TRANSLATION_SETTINGS, &raw).await?;
    let saved = view(settings);
    emit_event(emitter, TRANSLATION_SETTINGS_CHANGED_EVENT, &saved);
    Ok(saved)
}

pub async fn translate_texts_core(
    db: &AppDatabase,
    request: TranslateRequest,
) -> Result<TranslateResult, AppCommandError> {
    let settings = load_translation_settings(&db.conn).await;
    let keys = credentials::load();
    Ok(translation::translate_texts(&db.conn, &settings, &keys, request).await?)
}

/// Translate a fixed sentence through one engine — the saved settings, no
/// cache, no fallback — and report how long it took.
pub async fn test_translation_provider_core(
    db: &AppDatabase,
    provider: TranslationProvider,
) -> Result<TranslationTestResult, AppCommandError> {
    let settings = load_translation_settings(&db.conn).await;
    let keys = credentials::load();
    let api_key = keys.get(provider).to_string();
    if api_key.is_empty() {
        return Err(TranslateError::MissingKey {
            provider: translation::provider_name(provider),
        }
        .into());
    }
    let (model, base_url) = match provider {
        TranslationProvider::Dashscope => (&settings.dashscope_model, &settings.dashscope_base_url),
        TranslationProvider::Tokenhub => (&settings.tokenhub_model, &settings.tokenhub_base_url),
    };
    let engine = Engine {
        provider,
        model: model.clone(),
        base_url: base_url.clone(),
        api_key,
    };
    let target = settings
        .output_target
        .as_deref()
        .and_then(languages::find)
        .unwrap_or_else(|| languages::find("zh-CN").expect("zh-CN is offered"));
    let started = std::time::Instant::now();
    let translated = translation::translate_sample(&settings, &engine, TEST_SAMPLE, target).await?;
    Ok(TranslationTestResult {
        model: engine.model,
        elapsed_ms: started.elapsed().as_millis() as u64,
        sample: TEST_SAMPLE.to_string(),
        translation: translated,
    })
}

pub async fn clear_translation_cache_core(db: &AppDatabase) -> Result<u64, AppCommandError> {
    Ok(translation_cache_service::clear(&db.conn).await?)
}

/// What a sent message is looked up by: its text with the surrounding
/// whitespace and Windows line endings set aside — all that differs between
/// the composer's text and the same message reloaded from a transcript.
fn sent_key(text: &str) -> String {
    sha256_hex(text.replace("\r\n", "\n").trim().as_bytes())
}

/// Remember what the user wrote before the composer translated it, under
/// every form the sent message may come back in (`sent`: the text the agent
/// got, and the composer's display form when that differs).
pub async fn save_sent_original_core(
    db: &AppDatabase,
    sent: Vec<String>,
    original: String,
) -> Result<(), AppCommandError> {
    let original = original.trim();
    let mut keys: Vec<String> = sent
        .iter()
        .filter(|text| !text.trim().is_empty() && text.trim() != original)
        .map(|text| sent_key(text))
        .collect();
    keys.sort();
    keys.dedup();
    if original.is_empty() || keys.is_empty() {
        return Ok(());
    }
    Ok(translation_original_service::put(&db.conn, &keys, original).await?)
}

/// The original of each sent message, where one was remembered.
pub async fn get_sent_originals_core(
    db: &AppDatabase,
    texts: Vec<String>,
) -> Result<Vec<Option<String>>, AppCommandError> {
    let keys: Vec<String> = texts.iter().map(|text| sent_key(text)).collect();
    let found = translation_original_service::get_many(&db.conn, &keys).await?;
    Ok(keys.iter().map(|key| found.get(key).cloned()).collect())
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn get_translation_settings(
    db: State<'_, AppDatabase>,
) -> Result<TranslationSettingsView, AppCommandError> {
    get_translation_settings_core(&db).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn save_translation_settings(
    app: tauri::AppHandle,
    db: State<'_, AppDatabase>,
    settings: TranslationSettingsInput,
) -> Result<TranslationSettingsView, AppCommandError> {
    save_translation_settings_core(&EventEmitter::Tauri(app), &db, settings).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn translate_texts(
    db: State<'_, AppDatabase>,
    request: TranslateRequest,
) -> Result<TranslateResult, AppCommandError> {
    translate_texts_core(&db, request).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn test_translation_provider(
    db: State<'_, AppDatabase>,
    provider: TranslationProvider,
) -> Result<TranslationTestResult, AppCommandError> {
    test_translation_provider_core(&db, provider).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn clear_translation_cache(db: State<'_, AppDatabase>) -> Result<u64, AppCommandError> {
    clear_translation_cache_core(&db).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn save_sent_original(
    db: State<'_, AppDatabase>,
    sent: Vec<String>,
    original: String,
) -> Result<(), AppCommandError> {
    save_sent_original_core(&db, sent, original).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn get_sent_originals(
    db: State<'_, AppDatabase>,
    texts: Vec<String>,
) -> Result<Vec<Option<String>>, AppCommandError> {
    get_sent_originals_core(&db, texts).await
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use crate::db::test_helpers::fresh_in_memory_db;
    use crate::web::event_bridge::WebEventBroadcaster;

    fn input(settings: TranslationSettings) -> TranslationSettingsInput {
        TranslationSettingsInput {
            settings,
            dashscope_api_key: None,
            tokenhub_api_key: None,
        }
    }

    #[tokio::test]
    async fn a_save_stores_keys_apart_from_the_row_and_broadcasts_the_view() {
        let _guard = credentials::test_guard().await;
        let db = fresh_in_memory_db().await;
        let broadcaster = Arc::new(WebEventBroadcaster::new());
        let mut rx = broadcaster.subscribe();
        let emitter = EventEmitter::test_web_only(broadcaster.clone());

        let mut save = input(TranslationSettings {
            output_auto: true,
            ..TranslationSettings::default()
        });
        save.dashscope_api_key = Some(" sk-secret ".into());
        let saved = save_translation_settings_core(&emitter, &db, save)
            .await
            .expect("save");
        assert!(saved.has_dashscope_key);
        assert!(!saved.has_tokenhub_key);
        assert!(saved.settings.output_auto);
        assert_eq!(credentials::load().dashscope, "sk-secret");

        let row = app_metadata_service::get_value(&db.conn, KEY_TRANSLATION_SETTINGS)
            .await
            .expect("read")
            .expect("row");
        assert!(!row.contains("sk-secret"), "the key must not reach SQLite");

        let evt = rx.try_recv().expect("broadcast");
        assert_eq!(evt.channel, TRANSLATION_SETTINGS_CHANGED_EVENT);
        let payload = &*evt.payload;
        assert_eq!(payload["has_dashscope_key"], true);
        assert!(!payload.to_string().contains("sk-secret"));

        // Absent keeps the key; empty removes it.
        let kept = save_translation_settings_core(&emitter, &db, input(saved.settings.clone()))
            .await
            .expect("save without key");
        assert!(kept.has_dashscope_key);
        let mut clear = input(saved.settings);
        clear.dashscope_api_key = Some(String::new());
        let cleared = save_translation_settings_core(&emitter, &db, clear)
            .await
            .expect("clear");
        assert!(!cleared.has_dashscope_key);
    }

    #[tokio::test]
    async fn settings_are_normalized_on_save_and_default_when_absent() {
        let _guard = credentials::test_guard().await;
        let db = fresh_in_memory_db().await;
        assert_eq!(
            load_translation_settings(&db.conn).await,
            TranslationSettings::default()
        );

        let messy = TranslationSettings {
            dashscope_model: "  ".into(),
            dashscope_base_url: "https://example.com/v1/".into(),
            output_target: Some("xx".into()),
            input_target: "JA".into(),
            glossary: vec![
                GlossaryEntry {
                    source: " agent ".into(),
                    target: "代理".into(),
                },
                GlossaryEntry {
                    source: "agent".into(),
                    target: "duplicate".into(),
                },
                GlossaryEntry {
                    source: "".into(),
                    target: "blank".into(),
                },
                GlossaryEntry {
                    source: "Codeg".into(),
                    target: "  ".into(),
                },
            ],
            ..TranslationSettings::default()
        };
        let saved = save_translation_settings_core(&EventEmitter::Noop, &db, input(messy))
            .await
            .expect("save")
            .settings;
        assert_eq!(saved.dashscope_model, DEFAULT_DASHSCOPE_MODEL);
        assert_eq!(saved.dashscope_base_url, "https://example.com/v1");
        assert_eq!(saved.output_target, None);
        assert_eq!(saved.input_target, "ja");
        assert_eq!(
            saved.glossary,
            vec![
                GlossaryEntry {
                    source: "agent".into(),
                    target: "代理".into()
                },
                // No translation: kept as written.
                GlossaryEntry {
                    source: "Codeg".into(),
                    target: "Codeg".into()
                },
            ]
        );
        assert_eq!(load_translation_settings(&db.conn).await, saved);
    }

    #[tokio::test]
    async fn a_corrupt_row_reads_as_the_defaults() {
        let db = fresh_in_memory_db().await;
        app_metadata_service::upsert_value(&db.conn, KEY_TRANSLATION_SETTINGS, "{not json")
            .await
            .expect("write");
        assert_eq!(
            load_translation_settings(&db.conn).await,
            TranslationSettings::default()
        );
    }

    #[tokio::test]
    async fn testing_an_engine_without_a_key_says_so() {
        let _guard = credentials::test_guard().await;
        let db = fresh_in_memory_db().await;
        let err = test_translation_provider_core(&db, TranslationProvider::Tokenhub)
            .await
            .expect_err("no key");
        assert_eq!(err.i18n_key.as_deref(), Some("errors.missingKey"));
    }

    #[tokio::test]
    async fn a_sent_message_finds_its_original_however_it_comes_back() {
        let db = fresh_in_memory_db().await;
        save_sent_original_core(
            &db,
            vec![
                "Check [a.ts](file:///a.ts) please".into(),
                "Check [a.ts](file:///a.ts) please".into(),
            ],
            "  看看 [a.ts](file:///a.ts)  ".into(),
        )
        .await
        .expect("save");

        let found = get_sent_originals_core(
            &db,
            vec![
                // Reloaded from a transcript: other line endings, padding.
                "\r\n Check [a.ts](file:///a.ts) please\r\n".into(),
                "Something else".into(),
            ],
        )
        .await
        .expect("get");
        assert_eq!(
            found,
            vec![Some("看看 [a.ts](file:///a.ts)".to_string()), None]
        );
    }

    #[tokio::test]
    async fn a_message_sent_as_written_has_no_original_to_keep() {
        let db = fresh_in_memory_db().await;
        save_sent_original_core(&db, vec!["same".into(), "  ".into()], "same".into())
            .await
            .expect("save");
        save_sent_original_core(&db, vec!["sent".into()], " ".into())
            .await
            .expect("save");
        let found = get_sent_originals_core(&db, vec!["same".into(), "sent".into()])
            .await
            .expect("get");
        assert_eq!(found, vec![None, None]);
    }

    #[tokio::test]
    async fn clearing_the_cache_keeps_the_originals() {
        let db = fresh_in_memory_db().await;
        save_sent_original_core(&db, vec!["Hello".into()], "你好".into())
            .await
            .expect("save");
        clear_translation_cache_core(&db).await.expect("clear");
        let found = get_sent_originals_core(&db, vec!["Hello".into()])
            .await
            .expect("get");
        assert_eq!(found, vec![Some("你好".to_string())]);
    }

    #[test]
    fn a_row_saved_with_the_old_direct_connection_switch_still_loads() {
        let parsed: TranslationSettings =
            serde_json::from_str(r#"{"provider":"tokenhub","direct_connection":false}"#)
                .expect("parse");
        assert_eq!(parsed.provider, TranslationProvider::Tokenhub);
        assert!(parsed.fallback_enabled, "missing fields take their defaults");
    }
}

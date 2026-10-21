//! Image generation settings, the settings page's test, and what the chat
//! card asks about a job. See `crate::image_gen` for the feature itself.
//!
//! Settings live in one `app_metadata` row; the API keys live in the OS
//! keyring (`image_gen::credentials`) and only whether a service has one
//! travels to the frontend. A save replaces the copy the running process works
//! from and broadcasts the view on [`IMAGE_GEN_SETTINGS_CHANGED_EVENT`].

use std::path::PathBuf;

use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

#[cfg(feature = "tauri-runtime")]
use tauri::State;

use crate::app_error::AppCommandError;
use crate::db::service::app_metadata_service;
use crate::db::AppDatabase;
use crate::image_gen::credentials;
use crate::image_gen::files::{self, EncodedImage};
use crate::image_gen::jobs::{self, JobView};
use crate::image_gen::providers::{self, GenerateRequest};
use crate::image_gen::settings::{
    self, default_save_dir, normalize, ImageGenSettings, ImageService, ModelRef,
};
use crate::web::event_bridge::{emit_event, EventEmitter};

pub const KEY_IMAGE_GEN_SETTINGS: &str = "image_gen_settings";
pub const IMAGE_GEN_SETTINGS_CHANGED_EVENT: &str = "image-gen-settings://changed";

/// The prompt the settings page's test generates: cheap, and obviously right
/// or wrong at a glance.
const TEST_PROMPT: &str = "A single red apple on a plain white background, flat illustration.";

/// Saves run one at a time from the write through the broadcast, so the last
/// broadcast every client keeps is the last write.
static SAVE_LOCK: std::sync::LazyLock<tokio::sync::Mutex<()>> =
    std::sync::LazyLock::new(|| tokio::sync::Mutex::new(()));

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ImageServiceView {
    #[serde(flatten)]
    pub service: ImageService,
    pub has_key: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ImageGenSettingsView {
    pub enabled: bool,
    pub services: Vec<ImageServiceView>,
    pub default_model: Option<ModelRef>,
    pub save_dir: String,
    /// Where images go when `save_dir` is empty, for the placeholder.
    pub default_save_dir: String,
    pub send_preview: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ImageServiceInput {
    #[serde(flatten)]
    pub service: ImageService,
    /// Absent keeps the stored key, empty removes it, anything else replaces
    /// it.
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ImageGenSettingsInput {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub services: Vec<ImageServiceInput>,
    #[serde(default)]
    pub default_model: Option<ModelRef>,
    #[serde(default)]
    pub save_dir: String,
    #[serde(default = "default_true")]
    pub send_preview: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ImageGenTestResult {
    pub model: String,
    pub elapsed_ms: u64,
    pub image: EncodedImage,
}

/// Missing or malformed reads as the defaults: corrupt persistence is "no
/// preference yet", never a hard error.
pub async fn load_image_gen_settings(conn: &DatabaseConnection) -> ImageGenSettings {
    let raw = match app_metadata_service::get_value(conn, KEY_IMAGE_GEN_SETTINGS).await {
        Ok(Some(raw)) => raw,
        Ok(None) => return ImageGenSettings::default(),
        Err(err) => {
            tracing::warn!("[IMAGE_GEN] failed to read settings: {err}");
            return ImageGenSettings::default();
        }
    };
    match serde_json::from_str::<ImageGenSettings>(&raw) {
        Ok(settings) => normalize(settings),
        Err(err) => {
            tracing::warn!("[IMAGE_GEN] failed to parse settings: {err}");
            ImageGenSettings::default()
        }
    }
}

/// Load the saved settings into the running process; called at startup.
pub async fn apply_persisted_image_gen_settings(conn: &DatabaseConnection) {
    settings::set_runtime_settings(load_image_gen_settings(conn).await);
}

fn view(settings: ImageGenSettings) -> ImageGenSettingsView {
    let keys = credentials::load();
    ImageGenSettingsView {
        enabled: settings.enabled,
        services: settings
            .services
            .into_iter()
            .map(|service| ImageServiceView {
                has_key: keys.get(&service.id).is_some_and(|k| !k.is_empty()),
                service,
            })
            .collect(),
        default_model: settings.default_model,
        save_dir: settings.save_dir,
        default_save_dir: default_save_dir().to_string_lossy().to_string(),
        send_preview: settings.send_preview,
    }
}

async fn persist(
    conn: &DatabaseConnection,
    emitter: &EventEmitter,
    settings: ImageGenSettings,
) -> Result<ImageGenSettingsView, AppCommandError> {
    let raw = serde_json::to_string(&settings).map_err(|e| {
        AppCommandError::invalid_input("Invalid image generation settings")
            .with_detail(e.to_string())
    })?;
    app_metadata_service::upsert_value(conn, KEY_IMAGE_GEN_SETTINGS, &raw).await?;
    settings::set_runtime_settings(settings.clone());
    let saved = view(settings);
    emit_event(emitter, IMAGE_GEN_SETTINGS_CHANGED_EVENT, &saved);
    Ok(saved)
}

pub async fn get_image_gen_settings_core(
    db: &AppDatabase,
) -> Result<ImageGenSettingsView, AppCommandError> {
    Ok(view(load_image_gen_settings(&db.conn).await))
}

/// Keys first, then the row: a key that failed to store aborts the save before
/// the row claims a configuration that cannot work. A service saved without an
/// id gets one before its key is stored under it.
pub async fn save_image_gen_settings_core(
    emitter: &EventEmitter,
    db: &AppDatabase,
    input: ImageGenSettingsInput,
) -> Result<ImageGenSettingsView, AppCommandError> {
    let _one_at_a_time = SAVE_LOCK.lock().await;
    let mut services = Vec::with_capacity(input.services.len());
    let mut key_changes: Vec<(String, String)> = Vec::new();
    for mut item in input.services {
        if item.service.id.trim().is_empty() {
            item.service.id = uuid::Uuid::new_v4().to_string();
        }
        if let Some(key) = item.api_key {
            key_changes.push((item.service.id.clone(), key));
        }
        services.push(item.service);
    }
    let settings = normalize(ImageGenSettings {
        enabled: input.enabled,
        services,
        default_model: input.default_model,
        save_dir: input.save_dir,
        send_preview: input.send_preview,
    });
    let keep: Vec<String> = settings.services.iter().map(|s| s.id.clone()).collect();
    credentials::update(&key_changes, &keep)?;
    persist(&db.conn, emitter, settings).await
}

/// The status-bar popover's switch: only `enabled` changes.
pub async fn set_image_gen_enabled_core(
    conn: &DatabaseConnection,
    emitter: &EventEmitter,
    enabled: bool,
) -> Result<ImageGenSettingsView, AppCommandError> {
    let _one_at_a_time = SAVE_LOCK.lock().await;
    let mut settings = load_image_gen_settings(conn).await;
    settings.enabled = enabled;
    persist(conn, emitter, settings).await
}

/// Generate one small, cheap image with a saved service and model, and report
/// how long it took. Uses the saved settings, so a key must be saved first.
pub async fn test_image_gen_service_core(
    db: &AppDatabase,
    service_id: String,
    model: String,
) -> Result<ImageGenTestResult, AppCommandError> {
    let settings = load_image_gen_settings(&db.conn).await;
    let Some(service) = settings.services.iter().find(|s| s.id == service_id) else {
        return Err(AppCommandError::not_found("Image service not found"));
    };
    let api_key = credentials::load()
        .get(&service.id)
        .cloned()
        .unwrap_or_default();
    if api_key.is_empty() {
        return Err(AppCommandError::configuration_invalid(
            "Save an API key for this service first",
        ));
    }
    let is_gpt_image = model.to_ascii_lowercase().starts_with("gpt-image");
    let request = GenerateRequest {
        prompt: TEST_PROMPT.to_string(),
        aspect_ratio: Some("1:1".to_string()),
        quality: is_gpt_image.then(|| "low".to_string()),
        ..Default::default()
    };
    let started = std::time::Instant::now();
    let generated = providers::generate(service, &model, &api_key, &request)
        .await
        .map_err(|e| AppCommandError::network("Image generation failed").with_detail(e))?;
    let elapsed_ms = started.elapsed().as_millis() as u64;
    let image = tokio::task::spawn_blocking(move || files::preview(&generated.bytes))
        .await
        .map_err(|e| {
            AppCommandError::io_error("Reading the image failed").with_detail(e.to_string())
        })?
        .map_err(|e| AppCommandError::io_error("Reading the image failed").with_detail(e))?;
    Ok(ImageGenTestResult {
        model,
        elapsed_ms,
        image,
    })
}

/// A job, for the chat card.
pub async fn image_gen_job_status_core(job_id: String) -> Result<JobView, AppCommandError> {
    Ok(jobs::status(&job_id))
}

/// A generated image file, for the chat card: as it is when small enough,
/// otherwise shrunk. Only image files are read.
pub async fn image_gen_load_image_core(path: String) -> Result<EncodedImage, AppCommandError> {
    let path = crate::parsers::expand_home_prefix(path.trim(), dirs::home_dir().as_ref());
    let is_image = path
        .extension()
        .and_then(|e| e.to_str())
        .and_then(files::OutputFormat::from_extension)
        .is_some();
    if !is_image || !path.is_absolute() {
        return Err(AppCommandError::invalid_input("Not an image file path"));
    }
    let path: PathBuf = path;
    tokio::task::spawn_blocking(move || files::load_for_display(&path))
        .await
        .map_err(|e| {
            AppCommandError::io_error("Reading the image failed").with_detail(e.to_string())
        })?
        .map_err(|e| AppCommandError::not_found("Image not found").with_detail(e))
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn get_image_gen_settings(
    db: State<'_, AppDatabase>,
) -> Result<ImageGenSettingsView, AppCommandError> {
    get_image_gen_settings_core(&db).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn save_image_gen_settings(
    app: tauri::AppHandle,
    db: State<'_, AppDatabase>,
    settings: ImageGenSettingsInput,
) -> Result<ImageGenSettingsView, AppCommandError> {
    save_image_gen_settings_core(&EventEmitter::Tauri(app), &db, settings).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn test_image_gen_service(
    db: State<'_, AppDatabase>,
    service_id: String,
    model: String,
) -> Result<ImageGenTestResult, AppCommandError> {
    test_image_gen_service_core(&db, service_id, model).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn image_gen_job_status(job_id: String) -> Result<JobView, AppCommandError> {
    image_gen_job_status_core(job_id).await
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn image_gen_load_image(path: String) -> Result<EncodedImage, AppCommandError> {
    image_gen_load_image_core(path).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::image_gen::settings::ServiceKind;

    async fn db() -> AppDatabase {
        crate::db::test_helpers::fresh_in_memory_db().await
    }

    fn service_input(id: &str, key: Option<&str>) -> ImageServiceInput {
        ImageServiceInput {
            service: ImageService {
                id: id.into(),
                name: "Relay".into(),
                kind: ServiceKind::Openai,
                base_url: "https://relay.example.com/v1/".into(),
                models: vec!["gpt-image-2".into()],
            },
            api_key: key.map(str::to_string),
        }
    }

    #[tokio::test]
    async fn save_stores_keys_apart_and_reports_only_their_presence() {
        let _guard = credentials::test_guard().await;
        credentials::replace_all_for_test(&[]);
        let db = db().await;
        let emitter = EventEmitter::Noop;
        let saved = save_image_gen_settings_core(
            &emitter,
            &db,
            ImageGenSettingsInput {
                enabled: true,
                services: vec![service_input("", Some("sk-secret"))],
                default_model: None,
                save_dir: String::new(),
                send_preview: true,
            },
        )
        .await
        .unwrap();
        let id = saved.services[0].service.id.clone();
        assert!(!id.is_empty());
        assert!(saved.services[0].has_key);
        assert_eq!(
            saved.services[0].service.base_url,
            "https://relay.example.com/v1"
        );
        let raw = app_metadata_service::get_value(&db.conn, KEY_IMAGE_GEN_SETTINGS)
            .await
            .unwrap()
            .unwrap();
        assert!(!raw.contains("sk-secret"), "the key never lands in the row");
        assert!(settings::is_ready());

        // Saving without the key keeps it; removing the service drops it.
        let kept = save_image_gen_settings_core(
            &emitter,
            &db,
            ImageGenSettingsInput {
                enabled: true,
                services: vec![service_input(&id, None)],
                default_model: None,
                save_dir: String::new(),
                send_preview: true,
            },
        )
        .await
        .unwrap();
        assert!(kept.services[0].has_key);
        save_image_gen_settings_core(
            &emitter,
            &db,
            ImageGenSettingsInput {
                enabled: true,
                services: vec![],
                default_model: None,
                save_dir: String::new(),
                send_preview: true,
            },
        )
        .await
        .unwrap();
        assert!(credentials::load().is_empty());
        assert!(!settings::is_ready());

        let toggled = set_image_gen_enabled_core(&db.conn, &emitter, false)
            .await
            .unwrap();
        assert!(!toggled.enabled);
        settings::set_runtime_settings(ImageGenSettings::default());
    }
}

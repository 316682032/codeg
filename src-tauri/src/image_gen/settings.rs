//! What the person configured for image generation, and the copy of it the
//! running process works from.

use std::path::PathBuf;
use std::sync::{LazyLock, RwLock};

use serde::{Deserialize, Serialize};

use super::credentials;

pub const OPENAI_BASE_URL: &str = "https://api.openai.com/v1";
pub const GEMINI_BASE_URL: &str = "https://generativelanguage.googleapis.com/v1beta";

/// Which API a service speaks.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServiceKind {
    /// `POST {base}/images/generations` and `/images/edits`: OpenAI, xAI, and
    /// the relays that forward them (new-api, one-api, LiteLLM).
    #[default]
    Openai,
    /// `POST {base}/models/{model}:generateContent`: Google, and relays that
    /// forward Gemini's own API.
    Gemini,
}

impl ServiceKind {
    pub fn official_base_url(self) -> &'static str {
        match self {
            Self::Openai => OPENAI_BASE_URL,
            Self::Gemini => GEMINI_BASE_URL,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImageService {
    /// Stable id; the API key is stored under it.
    #[serde(default)]
    pub id: String,
    /// Shown to the person and the agent; empty shows the address's host.
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub kind: ServiceKind,
    /// Empty: the official address for `kind`.
    #[serde(default)]
    pub base_url: String,
    #[serde(default)]
    pub models: Vec<String>,
}

impl ImageService {
    pub fn effective_base_url(&self) -> &str {
        if self.base_url.is_empty() {
            self.kind.official_base_url()
        } else {
            &self.base_url
        }
    }

    /// The name, or the address's host when there is none.
    pub fn display_name(&self) -> String {
        if !self.name.is_empty() {
            return self.name.clone();
        }
        if self.base_url.is_empty() {
            return match self.kind {
                ServiceKind::Openai => "OpenAI".to_string(),
                ServiceKind::Gemini => "Google Gemini".to_string(),
            };
        }
        reqwest::Url::parse(&self.base_url)
            .ok()
            .and_then(|url| url.host_str().map(str::to_string))
            .unwrap_or_else(|| self.base_url.clone())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ModelRef {
    pub service_id: String,
    pub model: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ImageGenSettings {
    /// The codeg-mcp `image` group: on, agents launched from now on get the
    /// tools (when a service is usable); off, calls already offered refuse.
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub services: Vec<ImageService>,
    /// Used when the agent names no model. `None`, or one that is gone or
    /// has no key: the first usable model.
    #[serde(default)]
    pub default_model: Option<ModelRef>,
    /// Where an image goes when the agent gives no path; empty is
    /// [`default_save_dir`]. `~/` is expanded.
    #[serde(default)]
    pub save_dir: String,
    /// Attach a small preview of the image to the tool result, so the agent
    /// can see what it made. Costs context, and an agent on a model that
    /// cannot read images may choke on it.
    #[serde(default = "default_true")]
    pub send_preview: bool,
}

fn default_true() -> bool {
    true
}

impl Default for ImageGenSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            services: Vec::new(),
            default_model: None,
            save_dir: String::new(),
            send_preview: true,
        }
    }
}

/// Trim, drop blank models and duplicates, give every service an id, and
/// forget a default that names nothing.
pub fn normalize(mut s: ImageGenSettings) -> ImageGenSettings {
    let mut seen_ids: Vec<String> = Vec::new();
    for service in &mut s.services {
        service.name = service.name.trim().to_string();
        service.base_url = service.base_url.trim().trim_end_matches('/').to_string();
        if service.base_url == service.kind.official_base_url() {
            service.base_url.clear();
        }
        let mut models: Vec<String> = Vec::new();
        for model in &service.models {
            let model = model.trim();
            if !model.is_empty() && !models.iter().any(|m| m == model) {
                models.push(model.to_string());
            }
        }
        service.models = models;
        service.id = service.id.trim().to_string();
        if service.id.is_empty() || seen_ids.contains(&service.id) {
            service.id = uuid::Uuid::new_v4().to_string();
        }
        seen_ids.push(service.id.clone());
    }
    s.save_dir = s.save_dir.trim().to_string();
    if let Some(default) = &s.default_model {
        let exists = s
            .services
            .iter()
            .any(|svc| svc.id == default.service_id && svc.models.contains(&default.model));
        if !exists {
            s.default_model = None;
        }
    }
    s
}

/// `~/.codeg/generated-images`.
pub fn default_save_dir() -> PathBuf {
    crate::paths::codeg_home_dir().join("generated-images")
}

impl ImageGenSettings {
    pub fn save_root(&self) -> PathBuf {
        if self.save_dir.is_empty() {
            return default_save_dir();
        }
        crate::parsers::expand_home_prefix(&self.save_dir, dirs::home_dir().as_ref())
    }
}

/// One model an agent may use: a model name on a service that has a key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UsableModel {
    pub service: ImageService,
    pub model: String,
}

/// Every model on a service with a stored key, the default first.
pub fn usable_models(settings: &ImageGenSettings) -> Vec<UsableModel> {
    let keys = credentials::load();
    let mut out: Vec<UsableModel> = Vec::new();
    for service in &settings.services {
        if keys.get(&service.id).is_none_or(|k| k.is_empty()) {
            continue;
        }
        for model in &service.models {
            out.push(UsableModel {
                service: service.clone(),
                model: model.clone(),
            });
        }
    }
    if let Some(default) = &settings.default_model {
        if let Some(pos) = out
            .iter()
            .position(|m| m.service.id == default.service_id && m.model == default.model)
        {
            let first = out.remove(pos);
            out.insert(0, first);
        }
    }
    out
}

/// Pick the model for a call: the named one (by model name, or
/// `service/model` when several services offer it), else the default.
pub fn pick_model(
    settings: &ImageGenSettings,
    requested: Option<&str>,
) -> Result<UsableModel, String> {
    let usable = usable_models(settings);
    if usable.is_empty() {
        return Err(
            "No image service is ready: the user needs to add one with an API key and a model \
             in Codeg's Settings → Image generation."
                .to_string(),
        );
    }
    let Some(requested) = requested.map(str::trim).filter(|r| !r.is_empty()) else {
        return Ok(usable[0].clone());
    };
    if let Some(found) = usable.iter().find(|m| m.model == requested) {
        return Ok(found.clone());
    }
    if let Some((service, model)) = requested.split_once('/') {
        if let Some(found) = usable.iter().find(|m| {
            m.model == model
                && (m.service.display_name().eq_ignore_ascii_case(service)
                    || m.service.id == service)
        }) {
            return Ok(found.clone());
        }
    }
    let mut names: Vec<&str> = usable.iter().map(|m| m.model.as_str()).collect();
    names.dedup();
    Err(format!(
        "Model {requested:?} is not configured. Available: {}. Omit model to use the default.",
        names.join(", ")
    ))
}

static RUNTIME: LazyLock<RwLock<ImageGenSettings>> =
    LazyLock::new(|| RwLock::new(ImageGenSettings::default()));

/// The settings the process works from: loaded at startup, replaced on save.
pub fn runtime_settings() -> ImageGenSettings {
    RUNTIME.read().map(|s| s.clone()).unwrap_or_default()
}

pub fn set_runtime_settings(settings: ImageGenSettings) {
    if let Ok(mut guard) = RUNTIME.write() {
        *guard = settings;
    }
}

/// Whether to offer the image tools to an agent being launched: switched on,
/// and at least one model usable.
pub fn is_ready() -> bool {
    let settings = runtime_settings();
    settings.enabled && !usable_models(&settings).is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn service(id: &str, models: &[&str]) -> ImageService {
        ImageService {
            id: id.into(),
            name: String::new(),
            kind: ServiceKind::Openai,
            base_url: String::new(),
            models: models.iter().map(|m| m.to_string()).collect(),
        }
    }

    #[test]
    fn normalize_cleans_services_and_drops_a_dangling_default() {
        let s = normalize(ImageGenSettings {
            services: vec![
                ImageService {
                    id: "a".into(),
                    name: "  Relay ".into(),
                    kind: ServiceKind::Openai,
                    base_url: " https://relay.example.com/v1/ ".into(),
                    models: vec![" m1 ".into(), "".into(), "m1".into(), "m2".into()],
                },
                ImageService {
                    id: "a".into(),
                    kind: ServiceKind::Gemini,
                    base_url: GEMINI_BASE_URL.into(),
                    ..Default::default()
                },
            ],
            default_model: Some(ModelRef {
                service_id: "a".into(),
                model: "gone".into(),
            }),
            ..Default::default()
        });
        assert_eq!(s.services[0].name, "Relay");
        assert_eq!(s.services[0].base_url, "https://relay.example.com/v1");
        assert_eq!(s.services[0].models, vec!["m1", "m2"]);
        assert_ne!(s.services[1].id, "a", "a duplicate id gets a fresh one");
        assert_eq!(
            s.services[1].base_url, "",
            "the official address is stored empty"
        );
        assert_eq!(s.default_model, None);
    }

    #[test]
    fn display_name_falls_back_to_the_host() {
        let mut svc = service("x", &[]);
        assert_eq!(svc.display_name(), "OpenAI");
        svc.base_url = "https://api.x.ai/v1".into();
        assert_eq!(svc.display_name(), "api.x.ai");
        svc.name = "Grok".into();
        assert_eq!(svc.display_name(), "Grok");
    }

    #[tokio::test]
    async fn pick_model_prefers_the_named_then_the_default() {
        let _guard = credentials::test_guard().await;
        credentials::replace_all_for_test(&[("s1", "k1"), ("s2", "k2")]);
        let mut s2 = service("s2", &["shared", "only2"]);
        s2.name = "Two".into();
        let settings = ImageGenSettings {
            enabled: true,
            services: vec![
                service("s1", &["shared", "only1"]),
                s2,
                service("nokey", &["x"]),
            ],
            default_model: Some(ModelRef {
                service_id: "s2".into(),
                model: "only2".into(),
            }),
            ..Default::default()
        };
        assert_eq!(pick_model(&settings, None).unwrap().model, "only2");
        assert_eq!(
            pick_model(&settings, Some("only1")).unwrap().service.id,
            "s1"
        );
        assert_eq!(
            pick_model(&settings, Some("Two/shared"))
                .unwrap()
                .service
                .id,
            "s2"
        );
        let err = pick_model(&settings, Some("x")).unwrap_err();
        assert!(err.contains("not configured"), "{err}");
        credentials::replace_all_for_test(&[]);
        assert!(pick_model(&settings, None).is_err());
    }
}

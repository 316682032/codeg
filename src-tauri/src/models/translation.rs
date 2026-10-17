//! Wire types for the translation feature: the persisted settings, the view the
//! frontend reads them through (no API keys in it), the input it saves with, and
//! the translate request / result.

use serde::{Deserialize, Serialize};

pub const DEFAULT_DASHSCOPE_BASE_URL: &str = "https://dashscope.aliyuncs.com/compatible-mode/v1";
pub const DEFAULT_TOKENHUB_BASE_URL: &str = "https://tokenhub.tencentmaas.com/v1";
pub const DEFAULT_DASHSCOPE_MODEL: &str = "qwen-mt-flash";
pub const DEFAULT_TOKENHUB_MODEL: &str = "hy-mt2-plus";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "snake_case")]
pub enum TranslationProvider {
    /// Alibaba Cloud Bailian, qwen-mt models (OpenAI-compatible endpoint plus a
    /// non-standard `translation_options` field).
    #[default]
    Dashscope,
    /// Tencent Cloud TokenHub, hy-mt2 models (plain OpenAI chat completions with
    /// the instruction in the prompt). Tencent's older TMT `TextTranslate` API is
    /// being retired and takes no new users, so it is not offered.
    Tokenhub,
}

/// A term pair the user wants translated one fixed way. Applied in whichever
/// direction the text needs: `source` → `target` when `source` occurs in the
/// text, `target` → `source` when `target` does.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GlossaryEntry {
    pub source: String,
    pub target: String,
}

/// Stored as one JSON row in `app_metadata`. `#[serde(default)]` lets rows
/// written before a field existed parse with that field's default; a field
/// since dropped (`direct_connection`: requests now always go direct, see
/// `translation::client`) is ignored.
///
/// API keys are NOT here: they live in the OS keyring (the `0600` token store on
/// a server), so they never land in the SQLite file and every backup of it.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct TranslationSettings {
    pub provider: TranslationProvider,
    pub dashscope_model: String,
    pub dashscope_base_url: String,
    pub tokenhub_model: String,
    pub tokenhub_base_url: String,
    /// On a rate limit or an outage, retry on the next engine: qwen-mt-lite
    /// (its own quota), then the other provider when it has a key.
    pub fallback_enabled: bool,
    /// Translate assistant replies as they arrive.
    pub output_auto: bool,
    /// Language replies are translated into. `None` follows the UI language.
    pub output_target: Option<String>,
    /// Show an agent's question cards (the question, its options) translated
    /// without being asked. On by default: a question blocks the agent until
    /// it is answered, so it is the one thing that must be understood.
    pub question_auto: bool,
    /// Language the composer is translated into.
    pub input_target: String,
    /// Translate the composer automatically when a message is sent.
    pub input_translate_on_send: bool,
    pub glossary: Vec<GlossaryEntry>,
}

impl Default for TranslationSettings {
    fn default() -> Self {
        Self {
            provider: TranslationProvider::Dashscope,
            dashscope_model: DEFAULT_DASHSCOPE_MODEL.to_string(),
            dashscope_base_url: DEFAULT_DASHSCOPE_BASE_URL.to_string(),
            tokenhub_model: DEFAULT_TOKENHUB_MODEL.to_string(),
            tokenhub_base_url: DEFAULT_TOKENHUB_BASE_URL.to_string(),
            fallback_enabled: true,
            output_auto: false,
            output_target: None,
            question_auto: true,
            input_target: "en".to_string(),
            input_translate_on_send: false,
            glossary: Vec::new(),
        }
    }
}

/// What the frontend reads: the settings plus whether each key is stored.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TranslationSettingsView {
    #[serde(flatten)]
    pub settings: TranslationSettings,
    pub has_dashscope_key: bool,
    pub has_tokenhub_key: bool,
}

/// What the frontend saves. For each key: absent keeps the stored one, an empty
/// string removes it, anything else replaces it.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslationSettingsInput {
    #[serde(flatten)]
    pub settings: TranslationSettings,
    #[serde(default)]
    pub dashscope_api_key: Option<String>,
    #[serde(default)]
    pub tokenhub_api_key: Option<String>,
}

/// One translate call: segments (paragraphs) into one language.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslateRequest {
    pub texts: Vec<String>,
    /// Language code (`zh-CN`, `en`, …). See `translation::languages`.
    pub target: String,
    /// `None` lets the engine detect it.
    #[serde(default)]
    pub source: Option<String>,
    /// Which segments belong together — the paragraphs of one reply:
    /// `groups[i]` is segment `i`'s group. A group goes to the engine in one
    /// call so every paragraph is translated in the context of the others; it
    /// is split, at paragraph boundaries, only when longer than one call can
    /// take. `None`: the whole request is one group (a composer message).
    #[serde(default)]
    pub groups: Option<Vec<u32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TranslateResult {
    /// One entry per input text, in order. `None` when that text came back
    /// damaged (a placeholder or a code span lost) even after a retry on its
    /// own — the caller shows the original instead.
    pub translations: Vec<Option<String>>,
    /// The model that answered the last request, e.g. after a fallback.
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TranslationTestResult {
    pub model: String,
    pub elapsed_ms: u64,
    pub sample: String,
    pub translation: String,
}

use std::collections::BTreeMap;

use crate::app_error::{
    AppCommandError, TRANSLATION_I18N_KEY_AUTH, TRANSLATION_I18N_KEY_BAD_RESPONSE,
    TRANSLATION_I18N_KEY_MISSING_KEY, TRANSLATION_I18N_KEY_NETWORK,
    TRANSLATION_I18N_KEY_RATE_LIMITED, TRANSLATION_I18N_KEY_REJECTED,
    TRANSLATION_I18N_KEY_UNSUPPORTED_LANGUAGE,
};
use crate::db::error::DbError;

#[derive(Debug, thiserror::Error)]
pub enum TranslateError {
    #[error("no API key is stored for {provider}")]
    MissingKey { provider: &'static str },
    #[error("unsupported language: {0}")]
    UnsupportedLanguage(String),
    #[error("{model} rejected the API key ({status})")]
    Auth { model: String, status: u16 },
    #[error("{model} is rate limited")]
    RateLimited {
        model: String,
        retry_after: Option<std::time::Duration>,
    },
    /// A 4xx other than auth and rate limits: a model name the account cannot
    /// use, a body the engine refused. Retrying elsewhere will not fix it.
    #[error("{model} rejected the request ({status}): {message}")]
    Rejected {
        model: String,
        status: u16,
        message: String,
    },
    /// A 5xx: the engine is having a bad moment.
    #[error("{model} failed ({status}): {message}")]
    Server {
        model: String,
        status: u16,
        message: String,
    },
    #[error("could not reach {model}: {message}")]
    Network { model: String, message: String },
    #[error("unexpected response from {model}: {message}")]
    BadResponse { model: String, message: String },
    #[error(transparent)]
    Db(#[from] DbError),
}

impl TranslateError {
    /// Worth trying the next engine in the fallback chain. A rejected key or
    /// request is the user's to fix, and hiding it behind a fallback would make
    /// the misconfiguration invisible.
    pub fn is_transient(&self) -> bool {
        matches!(
            self,
            TranslateError::RateLimited { .. }
                | TranslateError::Server { .. }
                | TranslateError::Network { .. }
                | TranslateError::BadResponse { .. }
        )
    }
}

impl From<TranslateError> for AppCommandError {
    fn from(err: TranslateError) -> Self {
        let message = err.to_string();
        let params = |pairs: &[(&str, String)]| -> BTreeMap<String, String> {
            pairs
                .iter()
                .map(|(k, v)| (k.to_string(), v.clone()))
                .collect()
        };
        match err {
            TranslateError::MissingKey { provider } => {
                AppCommandError::configuration_missing(message).with_i18n(
                    TRANSLATION_I18N_KEY_MISSING_KEY,
                    params(&[("provider", provider.to_string())]),
                )
            }
            TranslateError::UnsupportedLanguage(code) => AppCommandError::invalid_input(message)
                .with_i18n(
                    TRANSLATION_I18N_KEY_UNSUPPORTED_LANGUAGE,
                    params(&[("language", code)]),
                ),
            TranslateError::Auth { model, .. } => AppCommandError::authentication_failed(message)
                .with_i18n(TRANSLATION_I18N_KEY_AUTH, params(&[("model", model)])),
            TranslateError::RateLimited { model, .. } => AppCommandError::network(message)
                .with_i18n(
                    TRANSLATION_I18N_KEY_RATE_LIMITED,
                    params(&[("model", model)]),
                ),
            TranslateError::Rejected {
                model,
                message: detail,
                ..
            } => AppCommandError::configuration_invalid(message).with_i18n(
                TRANSLATION_I18N_KEY_REJECTED,
                params(&[("model", model), ("message", detail)]),
            ),
            TranslateError::Server { model, .. } | TranslateError::Network { model, .. } => {
                AppCommandError::network(message)
                    .with_i18n(TRANSLATION_I18N_KEY_NETWORK, params(&[("model", model)]))
            }
            TranslateError::BadResponse { model, .. } => AppCommandError::network(message)
                .with_i18n(
                    TRANSLATION_I18N_KEY_BAD_RESPONSE,
                    params(&[("model", model)]),
                ),
            TranslateError::Db(db) => AppCommandError::from(db),
        }
    }
}

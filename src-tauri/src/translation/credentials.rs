//! The two engine API keys, kept out of the settings row.
//!
//! They go where this codebase keeps device-local credentials — the OS keyring
//! on desktop, the `0600` token store on a server ([`crate::keyring_store`]) —
//! so they never land in the SQLite file and every backup of it. Modeled on
//! `commands::config_sync::credentials`.
//!
//! Every translate call needs a key, and a keychain read is a blocking call into
//! the OS, so the keys are cached in memory after the first read and replaced on
//! every save.

use std::sync::RwLock;

use crate::app_error::AppCommandError;
use crate::models::translation::TranslationProvider;

/// Keyring entry names. Stable: renaming one orphans the stored key.
pub const DASHSCOPE_API_KEY: &str = "translation-dashscope-api-key";
pub const TOKENHUB_API_KEY: &str = "translation-tokenhub-api-key";

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ApiKeys {
    pub dashscope: String,
    pub tokenhub: String,
}

impl ApiKeys {
    pub fn get(&self, provider: TranslationProvider) -> &str {
        match provider {
            TranslationProvider::Dashscope => &self.dashscope,
            TranslationProvider::Tokenhub => &self.tokenhub,
        }
    }
}

static CACHE: RwLock<Option<ApiKeys>> = RwLock::new(None);

/// The stored keys, missing or unreadable ones as empty: a caller about to USE
/// a key reports "no key" either way.
pub fn load() -> ApiKeys {
    if let Ok(guard) = CACHE.read() {
        if let Some(keys) = guard.as_ref() {
            return keys.clone();
        }
    }
    let keys = ApiKeys {
        dashscope: store::get(DASHSCOPE_API_KEY)
            .ok()
            .flatten()
            .unwrap_or_default(),
        tokenhub: store::get(TOKENHUB_API_KEY)
            .ok()
            .flatten()
            .unwrap_or_default(),
    };
    if let Ok(mut guard) = CACHE.write() {
        *guard = Some(keys.clone());
    }
    keys
}

/// Whether a key is stored, keeping "the store would not open" an error so the
/// settings view does not report a key as gone when it merely could not be read.
pub fn is_stored(name: &str) -> Result<bool, AppCommandError> {
    store::get(name)
        .map(|value| value.is_some_and(|v| !v.is_empty()))
        .map_err(|e| {
            AppCommandError::io_error("Failed to read the translation API key").with_detail(e)
        })
}

/// Stores `value`, or removes the entry when it is empty, then drops the cache
/// so the next [`load`] sees the change.
pub fn store(name: &str, value: &str) -> Result<(), AppCommandError> {
    let result = if value.is_empty() {
        store::delete(name)
    } else {
        store::set(name, value)
    };
    if let Ok(mut guard) = CACHE.write() {
        *guard = None;
    }
    result.map_err(|e| {
        AppCommandError::io_error("Failed to store the translation API key").with_detail(e)
    })
}

#[cfg(not(test))]
mod store {
    pub fn get(name: &str) -> Result<Option<String>, String> {
        crate::keyring_store::get_secret(name)
    }
    pub fn set(name: &str, value: &str) -> Result<(), String> {
        crate::keyring_store::set_secret(name, value)
    }
    pub fn delete(name: &str) -> Result<(), String> {
        crate::keyring_store::delete_secret(name)
    }
}

/// Tests must never reach the developer's real login keychain (macOS would
/// prompt, CI has none), so the test build swaps in a process-local map.
#[cfg(test)]
mod store {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};

    fn map() -> &'static Mutex<HashMap<String, String>> {
        static MAP: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
        MAP.get_or_init(|| Mutex::new(HashMap::new()))
    }

    pub fn get(name: &str) -> Result<Option<String>, String> {
        Ok(map().lock().expect("key map").get(name).cloned())
    }
    pub fn set(name: &str, value: &str) -> Result<(), String> {
        map()
            .lock()
            .expect("key map")
            .insert(name.to_string(), value.to_string());
        Ok(())
    }
    pub fn delete(name: &str) -> Result<(), String> {
        map().lock().expect("key map").remove(name);
        Ok(())
    }
}

/// The store and its cache are process-global, so tests that write keys must
/// hold this for their duration. A `tokio` mutex because the holders await a
/// database while holding it.
#[cfg(test)]
pub async fn test_guard() -> tokio::sync::MutexGuard<'static, ()> {
    static GUARD: std::sync::OnceLock<tokio::sync::Mutex<()>> = std::sync::OnceLock::new();
    GUARD
        .get_or_init(|| tokio::sync::Mutex::new(()))
        .lock()
        .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn a_saved_key_is_read_back_and_clearing_removes_it() {
        let _guard = test_guard().await;
        store(DASHSCOPE_API_KEY, "sk-test").expect("store");
        assert_eq!(load().dashscope, "sk-test");
        assert!(is_stored(DASHSCOPE_API_KEY).expect("readable"));

        // The cache must not outlive a save.
        store(DASHSCOPE_API_KEY, "").expect("clear");
        assert_eq!(load().dashscope, "");
        assert!(!is_stored(DASHSCOPE_API_KEY).expect("readable"));
    }

    #[tokio::test]
    async fn the_two_keys_do_not_share_an_entry() {
        let _guard = test_guard().await;
        store(DASHSCOPE_API_KEY, "a").expect("store");
        store(TOKENHUB_API_KEY, "b").expect("store");
        let keys = load();
        assert_eq!(keys.get(TranslationProvider::Dashscope), "a");
        assert_eq!(keys.get(TranslationProvider::Tokenhub), "b");
        store(DASHSCOPE_API_KEY, "").expect("clear");
        store(TOKENHUB_API_KEY, "").expect("clear");
    }
}

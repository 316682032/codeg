//! The image services' API keys, kept out of the settings row.
//!
//! All of them live in ONE entry of the device-local credential store (the OS
//! keyring on desktop, the `0600` token store on a server; see
//! [`crate::keyring_store`]) as a JSON map from service id to key. One entry
//! rather than one per service: the store cannot list its entries, so per-
//! service entries would be orphaned whenever a save missed a removal, and
//! every new entry can mean another keychain prompt.
//!
//! Every generation needs a key and a keychain read is a blocking call into
//! the OS, so the map is cached after the first read and replaced on save.

use std::collections::HashMap;
use std::sync::RwLock;

use crate::app_error::AppCommandError;

/// Keyring entry name. Stable: renaming it orphans every stored key.
pub const API_KEYS_ENTRY: &str = "image-gen-api-keys";

pub type ApiKeys = HashMap<String, String>;

static CACHE: RwLock<Option<ApiKeys>> = RwLock::new(None);

/// Every stored key, by service id. A store that will not open, or an entry
/// that does not parse, reads as no keys: a caller about to use one reports
/// "no key" either way.
pub fn load() -> ApiKeys {
    if let Ok(guard) = CACHE.read() {
        if let Some(keys) = guard.as_ref() {
            return keys.clone();
        }
    }
    let keys = read().unwrap_or_default();
    if let Ok(mut guard) = CACHE.write() {
        *guard = Some(keys.clone());
    }
    keys
}

/// The stored map, keeping "the store would not open" an error: a save must
/// not rewrite the map from an empty read and wipe every other key.
fn read() -> Result<ApiKeys, AppCommandError> {
    let raw = store::get(API_KEYS_ENTRY).map_err(|e| {
        AppCommandError::io_error("Failed to read the image service API keys").with_detail(e)
    })?;
    Ok(raw
        .and_then(|raw| serde_json::from_str::<ApiKeys>(&raw).ok())
        .unwrap_or_default())
}

/// Apply `changes` (service id → new key; an empty key removes it), drop the
/// keys of services not in `keep_ids`, and write the map back.
pub fn update(changes: &[(String, String)], keep_ids: &[String]) -> Result<(), AppCommandError> {
    let mut keys = read()?;
    for (id, key) in changes {
        let key = key.trim();
        if key.is_empty() {
            keys.remove(id);
        } else {
            keys.insert(id.clone(), key.to_string());
        }
    }
    keys.retain(|id, key| keep_ids.contains(id) && !key.is_empty());
    let result = if keys.is_empty() {
        store::delete(API_KEYS_ENTRY)
    } else {
        let raw = serde_json::to_string(&keys).map_err(|e| {
            AppCommandError::io_error("Failed to encode the image service API keys")
                .with_detail(e.to_string())
        })?;
        store::set(API_KEYS_ENTRY, &raw)
    };
    if let Ok(mut guard) = CACHE.write() {
        *guard = None;
    }
    result.map_err(|e| {
        AppCommandError::io_error("Failed to store the image service API keys").with_detail(e)
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

/// Tests must never reach the developer's real login keychain, so the test
/// build swaps in a process-local map.
#[cfg(test)]
mod store {
    use std::collections::HashMap;
    use std::sync::{Mutex, OnceLock};

    pub(super) fn map() -> &'static Mutex<HashMap<String, String>> {
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

/// Replace every stored key; tests only.
#[cfg(test)]
pub fn replace_all_for_test(keys: &[(&str, &str)]) {
    let map: ApiKeys = keys
        .iter()
        .map(|(id, key)| (id.to_string(), key.to_string()))
        .collect();
    store::map().lock().expect("key map").insert(
        API_KEYS_ENTRY.to_string(),
        serde_json::to_string(&map).unwrap(),
    );
    if let Ok(mut guard) = CACHE.write() {
        *guard = None;
    }
}

/// The store and its cache are process-global; tests that touch keys hold
/// this for their duration.
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
    async fn update_sets_removes_and_drops_unknown_services() {
        let _guard = test_guard().await;
        replace_all_for_test(&[("a", "ka"), ("b", "kb"), ("gone", "kg")]);
        update(
            &[("a".into(), " ka2 ".into()), ("b".into(), "".into())],
            &["a".to_string(), "b".to_string(), "c".to_string()],
        )
        .unwrap();
        let keys = load();
        assert_eq!(keys.get("a").map(String::as_str), Some("ka2"));
        assert!(!keys.contains_key("b"));
        assert!(!keys.contains_key("gone"));
        update(&[], &[]).unwrap();
        assert!(load().is_empty());
    }
}

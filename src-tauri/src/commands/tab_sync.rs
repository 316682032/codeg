//! Whether every client of this backend shares one open-tab set — the
//! "Sync open conversation tabs across windows" switch.
//!
//! On (the default, and upstream's only behaviour): `opened_tabs` is the one
//! set, saved with compare-and-set and mirrored to every client over
//! `tabs://changed`. Off: each window keeps its own tabs and never touches
//! that table (see `src/stores/tab-store.ts`).
//!
//! Stored per backend in `app_metadata`, not per client: the switch decides
//! how the clients of one server relate to each other, so a value kept in each
//! browser meant a phone, a tablet and a desktop browser had to be switched one
//! by one — and any that wasn't silently stayed out of sync. Every save is
//! broadcast so all clients switch together. Fork-only (keh4l/codeg); not in
//! the config-sync allowlist, so like any new key it stays on this machine.

use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use crate::app_error::AppCommandError;
use crate::db::service::app_metadata_service;
use crate::web::event_bridge::{emit_event, EventEmitter};

pub const KEY_TAB_SYNC_ENABLED: &str = "tab_sync.enabled";

/// Announces a tab-sync settings write so every client of this backend
/// switches between the shared and the window-local tab set together.
/// Payload: [`TabSyncSettings`].
pub const TAB_SYNC_SETTINGS_CHANGED_EVENT: &str = "tab-sync-settings://changed";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TabSyncSettings {
    pub enabled: bool,
}

impl Default for TabSyncSettings {
    fn default() -> Self {
        Self { enabled: true }
    }
}

/// Read the persisted key, falling back to the default (on) for a missing or
/// malformed value. Never errors hard.
pub async fn load_tab_sync_settings(conn: &DatabaseConnection) -> TabSyncSettings {
    let mut settings = TabSyncSettings::default();
    if let Ok(Some(raw)) = app_metadata_service::get_value(conn, KEY_TAB_SYNC_ENABLED).await {
        if let Ok(v) = raw.parse::<bool>() {
            settings.enabled = v;
        }
    }
    settings
}

/// Persist + broadcast. Shared by the Tauri command and the HTTP handler.
pub async fn set_tab_sync_settings_core(
    conn: &DatabaseConnection,
    emitter: &EventEmitter,
    desired: TabSyncSettings,
) -> Result<TabSyncSettings, AppCommandError> {
    app_metadata_service::upsert_value(conn, KEY_TAB_SYNC_ENABLED, &desired.enabled.to_string())
        .await
        .map_err(AppCommandError::from)?;
    emit_event(emitter, TAB_SYNC_SETTINGS_CHANGED_EVENT, &desired);
    Ok(desired)
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn get_tab_sync_settings(
    db: tauri::State<'_, crate::db::AppDatabase>,
) -> Result<TabSyncSettings, AppCommandError> {
    Ok(load_tab_sync_settings(&db.conn).await)
}

#[cfg(feature = "tauri-runtime")]
#[cfg_attr(feature = "tauri-runtime", tauri::command)]
pub async fn set_tab_sync_settings(
    app: tauri::AppHandle,
    db: tauri::State<'_, crate::db::AppDatabase>,
    settings: TabSyncSettings,
) -> Result<TabSyncSettings, AppCommandError> {
    set_tab_sync_settings_core(&db.conn, &EventEmitter::Tauri(app), settings).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::web::event_bridge::WebEventBroadcaster;
    use std::sync::Arc;

    #[tokio::test]
    async fn settings_default_on_and_round_trip_with_broadcast() {
        let db = crate::db::test_helpers::fresh_in_memory_db().await;
        assert!(load_tab_sync_settings(&db.conn).await.enabled);

        let broadcaster = Arc::new(WebEventBroadcaster::new());
        let mut rx = broadcaster.subscribe();
        let emitter = EventEmitter::test_web_only(broadcaster.clone());
        let saved =
            set_tab_sync_settings_core(&db.conn, &emitter, TabSyncSettings { enabled: false })
                .await
                .expect("save");

        assert!(!saved.enabled);
        assert!(!load_tab_sync_settings(&db.conn).await.enabled);
        let evt = rx.try_recv().expect("a save is broadcast to every client");
        assert_eq!(evt.channel, TAB_SYNC_SETTINGS_CHANGED_EVENT);
        assert_eq!(evt.payload["enabled"], false);
    }

    #[tokio::test]
    async fn malformed_value_reads_as_the_default() {
        let db = crate::db::test_helpers::fresh_in_memory_db().await;
        app_metadata_service::upsert_value(&db.conn, KEY_TAB_SYNC_ENABLED, "maybe")
            .await
            .expect("write");
        assert!(load_tab_sync_settings(&db.conn).await.enabled);
    }
}

//! HTTP handlers for the tab-sync switch — the web-mode mirror of the Tauri
//! commands in `commands::tab_sync`.

use std::sync::Arc;

use axum::{extract::Extension, Json};
use serde::Deserialize;

use crate::app_error::AppCommandError;
use crate::app_state::AppState;
use crate::commands::tab_sync::{
    load_tab_sync_settings, set_tab_sync_settings_core, TabSyncSettings,
};

pub async fn get_tab_sync_settings(
    Extension(state): Extension<Arc<AppState>>,
) -> Result<Json<TabSyncSettings>, AppCommandError> {
    Ok(Json(load_tab_sync_settings(&state.db.conn).await))
}

#[derive(Deserialize)]
pub struct SetTabSyncSettingsParams {
    pub settings: TabSyncSettings,
}

pub async fn set_tab_sync_settings(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<SetTabSyncSettingsParams>,
) -> Result<Json<TabSyncSettings>, AppCommandError> {
    Ok(Json(
        set_tab_sync_settings_core(&state.db.conn, &state.emitter, params.settings).await?,
    ))
}

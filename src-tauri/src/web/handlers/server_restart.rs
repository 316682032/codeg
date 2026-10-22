//! Restarting the standalone server on request (keh4l build): Settings →
//! System → "Restart codeg", and the restart a staged backup restore waits
//! for (`restart_app` only ever restarts into a staged update).
//!
//! The same relaunch an in-place update ends with
//! ([`crate::update::schedule_restart`]): under the supervisor the worker exits
//! with `EXIT_RESTART` and is relaunched; standalone it re-execs itself. It
//! leaves no upgrade marker, so the supervisor relaunches it without the
//! upgrade's trial and rollback.

use std::sync::Arc;

use axum::{extract::Extension, Json};
use serde::Serialize;

use crate::app_error::AppCommandError;
use crate::app_state::AppState;
use crate::update::runtime::UpdateCapability;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerRestartResult {
    /// Relaunch delay (ms) the frontend countdown should use.
    pub restart_delay_ms: u64,
    pub capability: UpdateCapability,
}

/// Whether this process restarts itself on request: a server build, and not
/// on Windows, where the re-exec it takes (and the port rebind after it) has
/// not been validated — the in-place update is off there for the same reason.
pub fn supported() -> bool {
    !cfg!(feature = "tauri-runtime") && !cfg!(target_os = "windows")
}

pub async fn restart_server(
    Extension(state): Extension<Arc<AppState>>,
) -> Result<Json<ServerRestartResult>, AppCommandError> {
    restart_impl(state).map(Json)
}

#[cfg(feature = "tauri-runtime")]
fn restart_impl(_state: Arc<AppState>) -> Result<ServerRestartResult, AppCommandError> {
    // The embedded server of a desktop build is the desktop app: a browser
    // connected to it has no business relaunching someone's desktop.
    Err(AppCommandError::invalid_input(
        "Restarting is only available in server mode",
    ))
}

#[cfg(not(feature = "tauri-runtime"))]
fn restart_impl(state: Arc<AppState>) -> Result<ServerRestartResult, AppCommandError> {
    use crate::update::state as update_state;

    if !supported() {
        return Err(AppCommandError::invalid_input(
            "Restarting the server is not supported on Windows yet",
        ));
    }
    // Claim the update lifecycle's one system-op slot, flipping it to
    // `Restarting` so every window shows the restart: from a settled state (the
    // claim a rollback makes), or from a staged update, which this restart then
    // boots into exactly as `restart_app` would. A download or another restart
    // in flight wins.
    if !update_state::try_claim_rollback(&state.update_state, &state.emitter)
        && !update_state::try_claim_restart(&state.update_state, &state.emitter)
    {
        return Err(busy());
    }
    // Held until the process exits, so nothing slips into the flush window
    // and gets killed by the restart (see `schedule_restart`).
    let guard = state.system_op_lock.clone().try_lock_owned().map_err(|_| {
        update_state::set_error(
            &state.update_state,
            &state.emitter,
            "Another system operation is in progress",
        );
        busy()
    })?;
    let restart_delay_ms = crate::update::runtime::restart_delay_ms();
    crate::update::schedule_restart(guard);
    Ok(ServerRestartResult {
        restart_delay_ms,
        capability: crate::update::runtime::capability(),
    })
}

#[cfg(not(feature = "tauri-runtime"))]
fn busy() -> AppCommandError {
    AppCommandError::already_exists("An update operation is already in progress")
}

#[cfg(all(test, not(feature = "tauri-runtime"), not(target_os = "windows")))]
mod tests {
    use super::*;
    use crate::update::state as update_state;

    async fn test_state() -> (Arc<AppState>, tempfile::TempDir) {
        let db = crate::db::test_helpers::fresh_in_memory_db().await;
        let dir = tempfile::tempdir().unwrap();
        let state = Arc::new(AppState::new_for_test(db, dir.path().to_path_buf()));
        (state, dir)
    }

    #[tokio::test]
    async fn refuses_while_an_update_is_downloading() {
        let (state, _dir) = test_state().await;
        let (started, _) = update_state::try_begin(&state.update_state, &state.emitter);
        assert!(started);

        let err = restart_impl(state.clone()).unwrap_err();
        assert!(err.message.contains("already in progress"));
        // The download keeps its state and the lock stays free for it.
        assert_eq!(
            update_state::snapshot(&state.update_state).status,
            update_state::AppUpdateLifecycle::Downloading
        );
        assert!(state.system_op_lock.try_lock().is_ok());
    }

    #[tokio::test]
    async fn refuses_while_another_system_op_holds_the_lock() {
        let (state, _dir) = test_state().await;
        let _held = state.system_op_lock.clone().try_lock_owned().unwrap();

        let err = restart_impl(state.clone()).unwrap_err();
        assert!(err.message.contains("already in progress"));
        // Not left stuck on "restarting": the claim it made is turned into an
        // error every window can see and move on from.
        assert_eq!(
            update_state::snapshot(&state.update_state).status,
            update_state::AppUpdateLifecycle::Error
        );
    }
}

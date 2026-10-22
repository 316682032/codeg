//! "My agents" (keh4l build): the agents settings page lists only enabled
//! agents and offers the rest in an "Add agents" catalog, so `enabled` is
//! what puts an agent in front of the user.
//!
//! Upstream starts every built-in enabled, installed or not, which filled the
//! new-conversation picker with agents that cannot start (the session page
//! never installs one). Here a built-in agent whose settings row is created
//! while it is not installed starts out of "My agents" instead: on a fresh
//! database that is every agent the machine lacks, and on an existing one it
//! is a built-in added by a later release. Rows that already exist are never
//! touched — an upgrading user keeps exactly what they had — and an agent
//! installed later is not added by itself either.

use std::collections::HashSet;

use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, IntoActiveModel, QueryFilter,
    Set,
};

use tokio::sync::{Mutex, MutexGuard};

use crate::db::entities::agent_setting;
use crate::db::error::DbError;
use crate::db::service::agent_setting_service;
use crate::models::agent::AgentType;

/// Held by a list call that creates settings rows until it has reported (and
/// settled) them. The first launch lists agents from several places at once;
/// without it, a call that started a moment later found the new rows already
/// there, took them as long-standing, and reported `enabled` before the first
/// call got round to settling them.
static FIRST_SEEN: Mutex<()> = Mutex::const_new(());

/// What a list call knows about rows before `ensure_defaults` runs.
pub(crate) struct FirstSeen {
    known: Option<HashSet<AgentType>>,
    _creating: Option<MutexGuard<'static, ()>>,
}

impl FirstSeen {
    pub(crate) fn known(&self) -> Option<&HashSet<AgentType>> {
        self.known.as_ref()
    }
}

/// Call before `ensure_defaults` and keep the result until the agents are
/// reported. When some of `agents` have no row yet, this call creates them and
/// holds [`FIRST_SEEN`] meanwhile; a call with nothing to create waits only
/// for one that has.
pub(crate) async fn begin(conn: &DatabaseConnection, agents: &[AgentType]) -> FirstSeen {
    let guard = FIRST_SEEN.lock().await;
    let known = known_agents(conn).await;
    let creating = known
        .as_ref()
        .is_some_and(|known| agents.iter().any(|agent| !known.contains(agent)));
    FirstSeen {
        known,
        _creating: creating.then_some(guard),
    }
}

/// The agents that have a settings row before a list call creates the
/// missing ones. `None` when the table can't be read, which leaves every row
/// as `ensure_defaults` creates it.
pub(crate) async fn known_agents(conn: &DatabaseConnection) -> Option<HashSet<AgentType>> {
    agent_setting_service::list_map_by_agent_type(conn)
        .await
        .ok()
        .map(|rows| rows.into_keys().collect())
}

/// Whether an agent seen for the first time starts in "My agents": a custom
/// agent always does (the user just registered it), a built-in only when it
/// is installed.
pub(crate) fn starts_listed(agent_type: AgentType, installed_version: Option<&str>) -> bool {
    agent_type.is_custom() || installed_version.is_some()
}

/// The `enabled` a list call reports for `agent_type`, after settling a row
/// that this call created (absent from `known`) for an agent that should not
/// start listed. Any other row is reported as stored.
pub(crate) async fn settle_first_seen(
    conn: &DatabaseConnection,
    known: Option<&HashSet<AgentType>>,
    agent_type: AgentType,
    installed_version: Option<&str>,
    enabled: bool,
) -> bool {
    let Some(known) = known else {
        return enabled;
    };
    if !enabled || known.contains(&agent_type) || starts_listed(agent_type, installed_version) {
        return enabled;
    }
    match set_enabled(conn, agent_type, false).await {
        Ok(()) => false,
        Err(e) => {
            tracing::warn!("[acp] could not leave {agent_type:?} out of My agents: {e}");
            enabled
        }
    }
}

async fn set_enabled(
    conn: &DatabaseConnection,
    agent_type: AgentType,
    enabled: bool,
) -> Result<(), DbError> {
    let key = serde_json::to_string(&agent_type)
        .map_err(|e| DbError::Migration(format!("agent_type serialize failed: {e}")))?;
    let Some(model) = agent_setting::Entity::find()
        .filter(agent_setting::Column::AgentType.eq(key))
        .one(conn)
        .await?
    else {
        return Ok(());
    };
    let mut active = model.into_active_model();
    active.enabled = Set(enabled);
    active.updated_at = Set(Utc::now());
    active.update(conn).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::fresh_in_memory_db;
    use agent_setting_service::AgentDefaultInput;

    async fn create_rows(conn: &DatabaseConnection, agents: &[AgentType]) {
        let defaults: Vec<_> = agents
            .iter()
            .enumerate()
            .map(|(idx, agent_type)| AgentDefaultInput {
                agent_type: *agent_type,
                registry_id: format!("{agent_type:?}"),
                default_sort_order: idx as i32,
            })
            .collect();
        agent_setting_service::ensure_defaults(conn, &defaults)
            .await
            .expect("rows");
    }

    async fn stored(conn: &DatabaseConnection, agent_type: AgentType) -> bool {
        agent_setting_service::get_by_agent_type(conn, agent_type)
            .await
            .expect("read")
            .expect("row")
            .enabled
    }

    #[tokio::test]
    async fn a_built_in_first_seen_uninstalled_starts_out_of_my_agents() {
        let db = fresh_in_memory_db().await;
        let known = known_agents(&db.conn).await;
        assert_eq!(known.as_ref().map(HashSet::len), Some(0));
        create_rows(&db.conn, &[AgentType::Gemini, AgentType::ClaudeCode]).await;

        let gemini =
            settle_first_seen(&db.conn, known.as_ref(), AgentType::Gemini, None, true).await;
        assert!(!gemini);
        assert!(!stored(&db.conn, AgentType::Gemini).await);

        let claude = settle_first_seen(
            &db.conn,
            known.as_ref(),
            AgentType::ClaudeCode,
            Some("0.94.0"),
            true,
        )
        .await;
        assert!(claude);
        assert!(stored(&db.conn, AgentType::ClaudeCode).await);
    }

    #[tokio::test]
    async fn rows_that_already_existed_keep_what_they_had() {
        let db = fresh_in_memory_db().await;
        // An upgrading user: every built-in was enabled by an older build.
        create_rows(&db.conn, &[AgentType::Gemini]).await;
        let known = known_agents(&db.conn).await;

        let gemini =
            settle_first_seen(&db.conn, known.as_ref(), AgentType::Gemini, None, true).await;
        assert!(gemini);
        assert!(stored(&db.conn, AgentType::Gemini).await);
    }

    #[tokio::test]
    async fn a_call_that_creates_rows_holds_off_the_next_one() {
        let db = fresh_in_memory_db().await;
        let agents = [AgentType::Gemini];
        let first = begin(&db.conn, &agents).await;
        assert!(first._creating.is_some());
        let second = tokio::time::timeout(
            std::time::Duration::from_millis(50),
            begin(&db.conn, &agents),
        )
        .await;
        assert!(second.is_err(), "the second call waits for the first");

        create_rows(&db.conn, &agents).await;
        drop(first);
        let second = begin(&db.conn, &agents).await;
        assert!(second._creating.is_none());
        assert!(second
            .known()
            .is_some_and(|known| known.contains(&AgentType::Gemini)));
    }

    #[test]
    fn custom_agents_always_start_listed() {
        assert!(starts_listed(AgentType::Custom("goose"), None));
        assert!(!starts_listed(AgentType::Cline, None));
        assert!(starts_listed(AgentType::Cline, Some("1.0.0")));
    }
}

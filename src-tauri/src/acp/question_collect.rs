//! Answers to `ask_user_question` calls that returned before the user
//! answered.
//!
//! An agent whose tool calls time out quickly (see
//! [`crate::acp::tool_wait_cap`]) gets `pending` back from `ask_user_question`
//! while the question card stays up. When the user then answers, nobody is
//! parked on the question's one-shot any more, so the outcome is kept here
//! until the agent collects it with `get_question_answer`.
//!
//! Question ids are fresh UUIDs, so one process-wide table serves every
//! connection; each entry still records its connection, and only that
//! connection's companion can collect it.

use std::collections::HashMap;
use std::future::Future;
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

use tokio::sync::Notify;

use crate::acp::question::QuestionOutcome;

/// How long an uncollected answer is kept.
const KEEP_FOR: Duration = Duration::from_secs(60 * 60);

struct Answered {
    parent_connection_id: String,
    outcome: QuestionOutcome,
    at: Instant,
}

static ANSWERED: LazyLock<Mutex<HashMap<String, Answered>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Fired whenever a question is answered, withdrawn or kept.
static CHANGED: LazyLock<Notify> = LazyLock::new(Notify::new);

/// What `get_question_answer` found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CollectedAnswer {
    Answered(QuestionOutcome),
    /// Still waiting for the user.
    Pending,
    /// Withdrawn, already collected, or never asked on this connection.
    Gone,
}

/// Keep an answer no waiting call received.
pub fn keep(question_id: &str, parent_connection_id: &str, outcome: QuestionOutcome) {
    let mut map = ANSWERED.lock().unwrap_or_else(|e| e.into_inner());
    map.retain(|_, a| a.at.elapsed() < KEEP_FOR);
    map.insert(
        question_id.to_string(),
        Answered {
            parent_connection_id: parent_connection_id.to_string(),
            outcome,
            at: Instant::now(),
        },
    );
    drop(map);
    CHANGED.notify_waiters();
}

/// Wake collectors: a question was answered or withdrawn.
pub fn changed() {
    CHANGED.notify_waiters();
}

/// Forget a closing connection's uncollected answers.
pub fn drop_for_parent(parent_connection_id: &str) {
    ANSWERED
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .retain(|_, a| a.parent_connection_id != parent_connection_id);
}

fn take(question_id: &str, parent_connection_id: &str) -> Option<QuestionOutcome> {
    let mut map = ANSWERED.lock().unwrap_or_else(|e| e.into_inner());
    let owned = map
        .get(question_id)
        .is_some_and(|a| a.parent_connection_id == parent_connection_id);
    owned
        .then(|| map.remove(question_id))
        .flatten()
        .map(|a| a.outcome)
}

/// Wait up to `wait` (`None`: until answered) for the answer to `question_id`.
/// `is_pending` says whether the question is still in front of the user; it
/// must take the same lock the answering side holds while it calls [`keep`],
/// so a question is never seen as neither pending nor answered.
pub async fn collect<F, Fut>(
    question_id: &str,
    parent_connection_id: &str,
    wait: Option<Duration>,
    is_pending: F,
) -> CollectedAnswer
where
    F: Fn() -> Fut,
    Fut: Future<Output = bool>,
{
    let deadline = wait.map(|w| tokio::time::Instant::now() + w);
    loop {
        let notified = CHANGED.notified();
        tokio::pin!(notified);
        notified.as_mut().enable();
        let pending = is_pending().await;
        if let Some(outcome) = take(question_id, parent_connection_id) {
            return CollectedAnswer::Answered(outcome);
        }
        if !pending {
            return CollectedAnswer::Gone;
        }
        match deadline {
            Some(deadline) => {
                if tokio::time::Instant::now() >= deadline {
                    return CollectedAnswer::Pending;
                }
                tokio::select! {
                    _ = &mut notified => {}
                    _ = tokio::time::sleep_until(deadline) => {}
                }
            }
            None => notified.await,
        }
    }
}

/// Whether a permission request names codeg-mcp's `ask_user_question` or
/// `get_question_answer`, its continuation. Waiting on carries no decision the
/// question card doesn't, so it is allowed the way the ask is (see
/// `codeg_ask_auto_allow_option` in `acp/connection.rs`): an agent in a mode
/// that asks before every MCP call would otherwise stop the wait for an
/// approval card each time it comes back for the answer.
pub fn is_codeg_ask_or_collect_tool_name(name: &str) -> bool {
    crate::acp::question::is_codeg_ask_tool_name(name)
        || crate::acp::delegation::is_codeg_mcp_tool(name, "get_question_answer")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;

    #[test]
    fn the_collect_tool_is_allowed_like_the_ask() {
        for name in [
            "mcp__codeg-mcp__ask_user_question",
            "mcp__codeg-mcp__get_question_answer",
            "codeg-mcp/get_question_answer",
            "codeg-mcp: get_question_answer",
        ] {
            assert!(is_codeg_ask_or_collect_tool_name(name), "{name}");
        }
        for name in [
            "get_question_answer",
            "mcp__other-server__get_question_answer",
            "mcp__codeg-mcp__image_generate",
            "mcp__codeg-mcp__get_delegation_status",
        ] {
            assert!(!is_codeg_ask_or_collect_tool_name(name), "{name}");
        }
    }

    fn outcome(label: &str) -> QuestionOutcome {
        QuestionOutcome {
            answers: vec![crate::acp::question::QuestionAnsweredItem {
                question: "Which?".into(),
                header: "Pick".into(),
                multi_select: false,
                selected: vec![label.into()],
            }],
            declined: false,
        }
    }

    #[tokio::test]
    async fn an_answer_kept_earlier_is_collected_once() {
        let id = uuid::Uuid::new_v4().to_string();
        keep(&id, "conn-a", outcome("A"));
        let got = collect(&id, "conn-a", Some(Duration::from_millis(10)), || async {
            false
        })
        .await;
        assert_eq!(got, CollectedAnswer::Answered(outcome("A")));
        let again = collect(&id, "conn-a", Some(Duration::from_millis(10)), || async {
            false
        })
        .await;
        assert_eq!(again, CollectedAnswer::Gone);
    }

    #[tokio::test]
    async fn another_connection_cannot_collect_it() {
        let id = uuid::Uuid::new_v4().to_string();
        keep(&id, "conn-a", outcome("A"));
        let got = collect(&id, "conn-b", Some(Duration::from_millis(10)), || async {
            false
        })
        .await;
        assert_eq!(got, CollectedAnswer::Gone);
        drop_for_parent("conn-a");
    }

    #[tokio::test(start_paused = true)]
    async fn still_unanswered_returns_pending_at_the_deadline() {
        let id = uuid::Uuid::new_v4().to_string();
        let got = collect(&id, "conn-a", Some(Duration::from_secs(20)), || async {
            true
        })
        .await;
        assert_eq!(got, CollectedAnswer::Pending);
    }

    #[tokio::test]
    async fn an_answer_arriving_mid_wait_wakes_the_collector() {
        let id = uuid::Uuid::new_v4().to_string();
        let pending = Arc::new(AtomicBool::new(true));
        let waiter = {
            let id = id.clone();
            let pending = pending.clone();
            tokio::spawn(async move {
                collect(&id, "conn-a", Some(Duration::from_secs(30)), move || {
                    let pending = pending.clone();
                    async move { pending.load(Ordering::SeqCst) }
                })
                .await
            })
        };
        tokio::time::sleep(Duration::from_millis(20)).await;
        pending.store(false, Ordering::SeqCst);
        keep(&id, "conn-a", outcome("B"));
        let got = tokio::time::timeout(Duration::from_secs(5), waiter)
            .await
            .expect("woken")
            .unwrap();
        assert_eq!(got, CollectedAnswer::Answered(outcome("B")));
    }
}

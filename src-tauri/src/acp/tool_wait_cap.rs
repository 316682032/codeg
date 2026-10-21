//! How long one codeg-mcp tool call may block before it has to answer.
//!
//! Every agent CLI gives a single MCP `tools/call` a deadline of its own, and
//! nothing on the ACP wire can raise it: `session/new` hands an MCP server over
//! as `{name, command, args, env}` with no timeout field. A codeg-mcp tool that
//! waits on something slow — the user answering `ask_user_question`, a
//! delegated sub-agent, an image being generated — has to return before that
//! deadline, or the agent drops the call and whatever it was waiting for is
//! lost to it. So each such tool waits at most the cap below, then answers
//! "still waiting" with an id the agent passes to the matching collect tool.
//!
//! The values are each agent's deadline minus a margin, read from the source
//! (or binary) of the version codeg pins, as of 2026-10:
//!
//! | Agent | Deadline | Cap |
//! |---|---|---|
//! | ZCode (bridge 0.72) | 30 s wall clock, progress does not extend it | 20 s |
//! | Cursor, Kimi Code, DeepSeek | 60 s (MCP SDK default) | 45 s |
//! | OpenCode 1.19 | 60 s, restarted by progress notifications | 45 s |
//! | CommandCode 1.84 | 80 s idle, restarted by progress | 60 s |
//! | Kiro, Trae | not established (Kiro documents 120 s) | 90 s |
//! | Antigravity 1.4 | 180 s | 150 s |
//! | Codex (codex-acp 2.2), Hermes 0.22 | 300 s | 240 s |
//! | Gemini CLI 0.60 | 600 s | 480 s |
//! | Claude Code, Qoder, CodeBuddy, Grok | an hour or more | none |
//! | Custom agents | unknown | 20 s |
//!
//! `None` keeps the old behavior of blocking until the result is in.

use std::time::Duration;

use crate::models::agent::AgentType;

/// The longest a codeg-mcp tool call may block for `agent_type`; `None` when
/// the agent waits long enough that no cap is needed.
pub fn codeg_mcp_wait_cap(agent_type: AgentType) -> Option<Duration> {
    let secs = match agent_type {
        AgentType::ZCode => 20,
        AgentType::Cursor | AgentType::KimiCode | AgentType::DeepSeek | AgentType::OpenCode => 45,
        AgentType::CommandCode => 60,
        AgentType::Kiro | AgentType::Trae => 90,
        AgentType::Antigravity => 150,
        AgentType::Codex | AgentType::Hermes => 240,
        AgentType::Gemini => 480,
        AgentType::ClaudeCode | AgentType::Qoder | AgentType::CodeBuddy | AgentType::Grok => {
            return None
        }
        // These never receive codeg-mcp (no MCP over the wire), but give them
        // the safe value rather than none should that ever change.
        AgentType::OpenClaw | AgentType::Cline | AgentType::Pi => 20,
        AgentType::Custom(_) => 20,
    };
    Some(Duration::from_secs(secs))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_cap_stays_under_the_agent_deadline() {
        // (agent, its deadline): the cap must leave room for the round trip.
        let deadlines = [
            (AgentType::ZCode, 30),
            (AgentType::Cursor, 60),
            (AgentType::KimiCode, 60),
            (AgentType::DeepSeek, 60),
            (AgentType::OpenCode, 60),
            (AgentType::CommandCode, 80),
            (AgentType::Antigravity, 180),
            (AgentType::Codex, 300),
            (AgentType::Hermes, 300),
            (AgentType::Gemini, 600),
        ];
        for (agent, deadline) in deadlines {
            let cap = codeg_mcp_wait_cap(agent).expect("short-deadline agent has a cap");
            assert!(
                cap.as_secs() + 5 <= deadline,
                "{agent:?}: cap {cap:?} too close to {deadline}s"
            );
        }
    }

    #[test]
    fn long_waiting_agents_keep_blocking() {
        for agent in [
            AgentType::ClaudeCode,
            AgentType::Qoder,
            AgentType::CodeBuddy,
            AgentType::Grok,
        ] {
            assert_eq!(codeg_mcp_wait_cap(agent), None, "{agent:?}");
        }
    }

    #[test]
    fn unknown_agents_get_the_shortest_cap() {
        assert_eq!(
            codeg_mcp_wait_cap(AgentType::Custom("anything")),
            Some(Duration::from_secs(20))
        );
    }
}

//! What the image tools answered, kept for Cursor's live view.
//!
//! Cursor's ACP adapter finishes every MCP call with `rawOutput:
//! {"success": true}` and no content (its `mcpToolCall` cases in
//! `extractToolCallOutput` / `extractToolCallContent`), so the tool's own text
//! — the job id the image card follows, the saved path — never reaches the
//! chat while the turn runs. Its history has the text, so a reload shows it.
//!
//! [`note`] keeps each answer `image_generate` / `image_get_result` gave a
//! connection; the Cursor arm in `acp::connection` calls [`live_output`] on a
//! bare acknowledgement and shows the answer to the matching call instead.

use std::collections::{HashMap, VecDeque};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

use serde_json::Value;

/// Answers kept per connection; a turn rarely makes more than a few calls.
const PER_CONNECTION: usize = 16;
/// Long enough for the completion update that follows the answer.
const KEEP_FOR: Duration = Duration::from_secs(30 * 60);

pub const GENERATE: &str = "image_generate";
pub const GET_RESULT: &str = "image_get_result";

struct Answer {
    tool: &'static str,
    key: String,
    outcome: Value,
    at: Instant,
    /// The Cursor call this answer was shown on, so a repeated completion
    /// update gets the same text and the next call with the same input gets
    /// the next answer.
    call_id: Option<String>,
}

static ANSWERS: LazyLock<Mutex<HashMap<String, VecDeque<Answer>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn answers() -> std::sync::MutexGuard<'static, HashMap<String, VecDeque<Answer>>> {
    ANSWERS.lock().unwrap_or_else(|e| e.into_inner())
}

/// What tells two calls of one tool apart: the prompt of an
/// `image_generate`, the job ids of an `image_get_result`.
pub fn key_of(tool: &str, arguments: &Value) -> String {
    if tool == GENERATE {
        return arguments
            .get("prompt")
            .and_then(Value::as_str)
            .map(str::trim)
            .unwrap_or_default()
            .to_string();
    }
    let mut ids: Vec<&str> = match arguments.get("job_ids") {
        Some(Value::Array(arr)) => arr.iter().filter_map(Value::as_str).collect(),
        Some(Value::String(s)) => vec![s.as_str()],
        _ => Vec::new(),
    };
    key_of_job_ids(&mut ids)
}

pub fn key_of_job_ids(ids: &mut Vec<&str>) -> String {
    for id in ids.iter_mut() {
        *id = id.trim();
    }
    ids.retain(|id| !id.is_empty());
    ids.sort_unstable();
    ids.dedup();
    ids.join(",")
}

/// Keep `outcome` (the listener's answer, without preview images) for
/// [`live_output`].
pub fn note(parent_connection_id: &str, tool: &'static str, key: String, outcome: &Value) {
    let mut outcome = outcome.clone();
    if let Some(jobs) = outcome.get_mut("jobs").and_then(Value::as_array_mut) {
        for job in jobs {
            if let Some(job) = job.as_object_mut() {
                job.remove("preview");
            }
        }
    }
    let mut all = answers();
    all.retain(|_, list| {
        list.retain(|a| a.at.elapsed() < KEEP_FOR);
        !list.is_empty()
    });
    let list = all.entry(parent_connection_id.to_string()).or_default();
    list.push_back(Answer {
        tool,
        key,
        outcome,
        at: Instant::now(),
        call_id: None,
    });
    while list.len() > PER_CONNECTION {
        list.pop_front();
    }
}

/// The text to show for Cursor call `call_id`, when its raw output is the
/// bare `{"success": true}` and its input (`{providerIdentifier, toolName,
/// args}`) names a codeg-mcp image tool this connection has an answer for.
pub fn live_output(
    parent_connection_id: &str,
    call_id: &str,
    input: Option<&Value>,
    raw_output: &Option<Value>,
) -> Option<String> {
    let bare_success = raw_output
        .as_ref()
        .and_then(Value::as_object)
        .is_some_and(|o| o.len() == 1 && o.get("success") == Some(&Value::Bool(true)));
    if !bare_success {
        return None;
    }
    let input = input?;
    let provider = input.get("providerIdentifier").and_then(Value::as_str)?;
    if !matches!(provider, "codeg-mcp" | "codeg_mcp") {
        return None;
    }
    let tool = match input.get("toolName").and_then(Value::as_str)? {
        GENERATE => GENERATE,
        GET_RESULT => GET_RESULT,
        _ => return None,
    };
    let arguments = match input.get("args") {
        Some(Value::String(s)) => serde_json::from_str(s).unwrap_or(Value::Null),
        Some(v) => v.clone(),
        None => Value::Null,
    };
    let key = key_of(tool, &arguments);

    let mut all = answers();
    let list = all.get_mut(parent_connection_id)?;
    let index = list
        .iter()
        .position(|a| a.call_id.as_deref() == Some(call_id))
        .or_else(|| {
            list.iter()
                .position(|a| a.call_id.is_none() && a.tool == tool && a.key == key)
        })
        // An input Cursor reshaped on the way: the oldest unshown answer.
        .or_else(|| {
            list.iter()
                .position(|a| a.call_id.is_none() && a.tool == tool)
        })?;
    let answer = &mut list[index];
    answer.call_id = Some(call_id.to_string());
    Some(text_of(
        &crate::acp::delegation::fork_tools::render_image_jobs(&answer.outcome),
    ))
}

fn text_of(result: &Value) -> String {
    result
        .get("content")
        .and_then(Value::as_array)
        .map(|parts| {
            parts
                .iter()
                .filter_map(|p| p.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("\n")
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn cursor_input(tool: &str, args: Value) -> Value {
        json!({ "providerIdentifier": "codeg-mcp", "toolName": tool, "args": args })
    }

    fn done(job_id: &str, path: &str) -> Value {
        json!({ "jobs": [{
            "job_id": job_id, "status": "completed", "elapsed_ms": 5100,
            "path": path, "width": 768, "height": 768, "mime_type": "image/png",
            "model": "fake-image-5s", "service": "Relay",
            "preview": { "data": "AAAA", "mime_type": "image/jpeg" },
        }]})
    }

    fn running(job_id: &str) -> Value {
        json!({ "jobs": [{ "job_id": job_id, "status": "running", "elapsed_ms": 45000 }] })
    }

    const NO_OUTPUT: Option<Value> = None;

    fn ack() -> Option<Value> {
        Some(json!({ "success": true }))
    }

    #[test]
    fn a_bare_ack_shows_the_answer_to_that_call() {
        let parent = "cursor-conn-answer";
        note(
            parent,
            GENERATE,
            "a red fox".into(),
            &done("img-1", "/p/fox.png"),
        );
        let input = cursor_input(GENERATE, json!({ "prompt": " a red fox " }));
        let text = live_output(parent, "call-1", Some(&input), &ack()).unwrap();
        assert!(
            text.starts_with("Image saved to /p/fox.png (768x768, image/png, fake-image-5s via Relay, 5.1 s). job_id=img-1"),
            "{text}"
        );
        // The preview stays out of the chat text, and a repeated completion
        // update gets the same answer.
        assert!(!text.contains("AAAA"));
        assert_eq!(
            live_output(parent, "call-1", Some(&input), &ack()).unwrap(),
            text
        );
    }

    #[test]
    fn calls_with_the_same_input_take_answers_in_order() {
        let parent = "cursor-conn-order";
        note(parent, GET_RESULT, "img-2".into(), &running("img-2"));
        note(
            parent,
            GET_RESULT,
            "img-2".into(),
            &done("img-2", "/p/2.png"),
        );
        let input = cursor_input(GET_RESULT, json!({ "job_ids": ["img-2"] }));
        let first = live_output(parent, "call-a", Some(&input), &ack()).unwrap();
        let second = live_output(parent, "call-b", Some(&input), &ack()).unwrap();
        assert!(first.starts_with("Still generating (job_id=img-2, 45.0 s so far)."));
        assert!(second.starts_with("Image saved to /p/2.png"));
    }

    #[test]
    fn the_key_matches_before_the_order() {
        let parent = "cursor-conn-key";
        note(parent, GENERATE, "first".into(), &done("img-a", "/p/a.png"));
        note(
            parent,
            GENERATE,
            "second".into(),
            &done("img-b", "/p/b.png"),
        );
        let second = cursor_input(GENERATE, json!({ "prompt": "second" }));
        let text = live_output(parent, "call-2", Some(&second), &ack()).unwrap();
        assert!(text.contains("job_id=img-b"), "{text}");
        // A string `job_ids` and a JSON-string `args` are read too.
        note(
            parent,
            GET_RESULT,
            "img-c".into(),
            &done("img-c", "/p/c.png"),
        );
        let input = cursor_input(GET_RESULT, json!("{\"job_ids\":\"img-c\"}"));
        let text = live_output(parent, "call-3", Some(&input), &ack()).unwrap();
        assert!(text.contains("job_id=img-c"), "{text}");
    }

    #[test]
    fn only_a_bare_ack_on_a_codeg_image_call_is_replaced() {
        let parent = "cursor-conn-only";
        note(parent, GENERATE, "x".into(), &done("img-x", "/p/x.png"));
        let input = cursor_input(GENERATE, json!({ "prompt": "x" }));
        assert_eq!(live_output(parent, "c", Some(&input), &NO_OUTPUT), None);
        assert_eq!(
            live_output(
                parent,
                "c",
                Some(&input),
                &Some(json!({ "success": true, "x": 1 }))
            ),
            None
        );
        let foreign = json!({ "providerIdentifier": "other", "toolName": GENERATE, "args": { "prompt": "x" } });
        assert_eq!(live_output(parent, "c", Some(&foreign), &ack()), None);
        let other_tool = cursor_input("delegate_to_agent", json!({}));
        assert_eq!(live_output(parent, "c", Some(&other_tool), &ack()), None);
        assert_eq!(live_output(parent, "c", None, &ack()), None);
        assert_eq!(live_output("another-conn", "c", Some(&input), &ack()), None);
        // Still there for the call it belongs to.
        assert!(live_output(parent, "c", Some(&input), &ack()).is_some());
    }

    #[test]
    fn errors_show_as_their_text() {
        let parent = "cursor-conn-error";
        note(
            parent,
            GENERATE,
            "y".into(),
            &json!({ "error": "Unknown model nope." }),
        );
        let input = cursor_input(GENERATE, json!({ "prompt": "y" }));
        assert_eq!(
            live_output(parent, "c", Some(&input), &ack()).as_deref(),
            Some("Unknown model nope.")
        );
    }
}

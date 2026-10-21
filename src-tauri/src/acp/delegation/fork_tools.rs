//! The codeg-mcp tools the keh4l build adds, kept out of `companion.rs` so
//! upstream changes there merge cleanly:
//!
//! - **Bounded waits.** An agent drops a tool call that runs past its own
//!   deadline (30 s on ZCode; see [`crate::acp::tool_wait_cap`]). A call that
//!   waits on something slow therefore waits at most `--wait-cap-ms`, then
//!   answers "still waiting" with an id: `get_delegation_status` is clamped,
//!   `ask_user_question` returns `pending` and `get_question_answer` collects
//!   the answer, and `image_get_result` collects an image `image_generate`
//!   had not finished.
//! - **Progress.** While any call waits, a `notifications/progress` goes out
//!   every [`PROGRESS_INTERVAL`] when the client asked for them, which
//!   restarts the timer on hosts that allow that (OpenCode, CommandCode) and
//!   the idle timer on others (Claude Code, Qoder, CodeBuddy).
//! - **Images.** `image_generate` / `image_get_result`, served by
//!   `crate::image_gen` in the parent.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use serde_json::{json, Value};

use super::companion::{
    err, register_and_spawn, render_ask_result, CompanionContext, InflightCalls, LineAction,
};
use super::transport::{
    client_message_round_trip, BrokerAskCollectRequest, BrokerImageGenerateRequest,
    BrokerImageModelsRequest, BrokerImageResultRequest, BrokerMessage,
};

/// The schemas of the tools below, appended to the embedded upstream list.
const FORK_TOOL_SCHEMA_JSON: &str = include_str!("fork_tool_schema.json");

/// How often a waiting call reports progress.
const PROGRESS_INTERVAL: Duration = Duration::from_secs(10);

/// Upper bound on asking the parent for the image models at `tools/list`.
const IMAGE_MODELS_BUDGET: Duration = Duration::from_secs(5);

/// Writes a server→client notification (one JSON-RPC message) to the agent.
#[async_trait]
pub trait NotificationSink: Send + Sync {
    async fn send(&self, message: Value);
}

/// Where progress notifications go; empty in tests and anywhere there is no
/// agent stdout.
#[derive(Clone, Default)]
pub struct Notifier(Option<Arc<dyn NotificationSink>>);

impl Notifier {
    pub fn new(sink: Arc<dyn NotificationSink>) -> Self {
        Self(Some(sink))
    }
}

impl std::fmt::Debug for Notifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(if self.0.is_some() {
            "Notifier(stdout)"
        } else {
            "Notifier(none)"
        })
    }
}

/// Wrap a spawned call so it reports progress while it waits, when the
/// request carried a `progressToken` and there is somewhere to write. The
/// notifications are written from inside the call's own future, so none can
/// follow its response.
pub(super) fn with_progress(
    action: LineAction,
    ctx: &CompanionContext,
    params: &Value,
) -> LineAction {
    let LineAction::Spawn(mut spawned) = action else {
        return action;
    };
    let token = params
        .get("_meta")
        .and_then(|m| m.get("progressToken"))
        .filter(|t| t.is_string() || t.is_number())
        .cloned();
    let (Some(token), Some(sink)) = (token, ctx.notifier.0.clone()) else {
        return LineAction::Spawn(spawned);
    };
    let mut inner = spawned.future;
    spawned.future = Box::pin(async move {
        let start = tokio::time::Instant::now() + PROGRESS_INTERVAL;
        let mut ticks = tokio::time::interval_at(start, PROGRESS_INTERVAL);
        let mut seconds = 0u64;
        loop {
            tokio::select! {
                biased;
                result = &mut inner => return result,
                _ = ticks.tick() => {
                    seconds += PROGRESS_INTERVAL.as_secs();
                    sink.send(progress_notification(&token, seconds)).await;
                }
            }
        }
    });
    LineAction::Spawn(spawned)
}

fn progress_notification(token: &Value, seconds: u64) -> Value {
    json!({
        "jsonrpc": "2.0",
        "method": "notifications/progress",
        "params": { "progressToken": token, "progress": seconds },
    })
}

/// `get_delegation_status`'s `wait_ms` under the cap: a longer wait, or `0`
/// (block until done), becomes the cap; omitted stays an immediate snapshot.
pub(super) fn cap_status_wait(requested: Option<u64>, cap: Option<u64>) -> Option<u64> {
    match (requested, cap) {
        (None, _) => None,
        (Some(wait), None) => Some(wait),
        (Some(0), Some(cap)) => Some(cap),
        (Some(wait), Some(cap)) => Some(wait.min(cap)),
    }
}

/// How long a collect call waits: what the agent asked for, within the cap;
/// with neither, until the result is in.
fn collect_wait(arguments: &Value, cap: Option<u64>) -> Option<u64> {
    let requested = arguments
        .get("wait_ms")
        .and_then(Value::as_u64)
        .filter(|ms| *ms > 0);
    match (requested, cap) {
        (Some(wait), Some(cap)) => Some(wait.min(cap)),
        (Some(wait), None) => Some(wait),
        (None, cap) => cap,
    }
}

/// Add this build's tools to `tools/list`, and say in the waiting tools'
/// descriptions how long one call waits in this session.
pub(super) async fn extend_tool_list(ctx: &CompanionContext, tools: &mut Value) {
    if let Some(cap) = ctx.wait_cap_ms {
        note_wait_cap(tools, cap);
    }
    let Ok(Value::Array(extra)) = serde_json::from_str::<Value>(FORK_TOOL_SCHEMA_JSON) else {
        return;
    };
    let Some(list) = tools.as_array_mut() else {
        return;
    };
    for mut tool in extra {
        let Some(name) = tool.get("name").and_then(Value::as_str).map(str::to_string) else {
            continue;
        };
        if !ctx.features.allows_tool(&name) {
            continue;
        }
        // Without a cap `ask_user_question` waits for the answer itself, so
        // there is never one to collect.
        if name == "get_question_answer" && ctx.wait_cap_ms.is_none() {
            continue;
        }
        if name == "image_generate" {
            offer_image_models(ctx, &mut tool).await;
        }
        list.push(tool);
    }
}

fn note_wait_cap(tools: &mut Value, cap_ms: u64) {
    let secs = cap_ms.div_ceil(1000);
    let Some(list) = tools.as_array_mut() else {
        return;
    };
    for tool in list {
        let note = match tool.get("name").and_then(Value::as_str) {
            Some("get_delegation_status") => format!(
                " In this session one call waits at most {secs} s, the time this agent allows a \
                 tool call: a longer wait_ms, or 0, waits {secs} s and then returns the tasks' \
                 current status; call again to keep waiting."
            ),
            Some("ask_user_question") => format!(
                " In this session the call returns after {secs} s if the user has not answered \
                 by then, with pending: true and a question_id. The question stays in front of \
                 the user: call get_question_answer with that question_id to keep waiting for \
                 the answer, and do not ask again."
            ),
            _ => continue,
        };
        if let Some(Value::String(description)) = tool.get_mut("description") {
            description.push_str(&note);
        }
    }
}

/// Put the configured models into `image_generate`'s `model` enum. Without an
/// answer from the parent the field stays free text and the parent checks it.
async fn offer_image_models(ctx: &CompanionContext, tool: &mut Value) {
    let msg = BrokerMessage::ImageModels(BrokerImageModelsRequest {
        token: ctx.token.clone(),
    });
    let Ok(Ok(resp)) = tokio::time::timeout(
        IMAGE_MODELS_BUDGET,
        client_message_round_trip(&ctx.socket_path, &msg),
    )
    .await
    else {
        return;
    };
    let models: Vec<String> = resp
        .outcome
        .get("models")
        .and_then(Value::as_array)
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m.get("model").and_then(Value::as_str))
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default();
    if models.is_empty() {
        return;
    }
    let mut unique: Vec<String> = Vec::new();
    for model in models {
        if !unique.contains(&model) {
            unique.push(model);
        }
    }
    let default = resp.outcome.get("default").and_then(Value::as_str);
    let Some(field) = tool.pointer_mut("/inputSchema/properties/model") else {
        return;
    };
    field["enum"] = json!(unique);
    if let Some(default) = default {
        field["description"] = json!(format!(
            "Model to use. Omit to use the user's default, {default}."
        ));
    }
}

/// `tools/call` for this build's tools.
pub(super) async fn build_spawn(
    ctx: &CompanionContext,
    inflight: Arc<InflightCalls>,
    id: Value,
    name: &str,
    arguments: Value,
) -> LineAction {
    let socket = ctx.socket_path.clone();
    match name {
        "get_question_answer" => {
            let question_id =
                match arguments.get("question_id").and_then(Value::as_str) {
                    Some(s) if !s.trim().is_empty() => s.trim().to_string(),
                    _ => return LineAction::Respond(err(
                        id,
                        -32602,
                        "get_question_answer requires the question_id ask_user_question returned",
                    )),
                };
            let msg = BrokerMessage::AskCollect(BrokerAskCollectRequest {
                token: ctx.token.clone(),
                question_id,
                wait_ms: collect_wait(&arguments, ctx.wait_cap_ms),
            });
            let round_trip =
                Box::pin(async move { client_message_round_trip(&socket, &msg).await });
            register_and_spawn(inflight, id, None, round_trip, render_ask_outcome).await
        }
        "image_generate" => {
            let prompt_ok = arguments
                .get("prompt")
                .and_then(Value::as_str)
                .is_some_and(|p| !p.trim().is_empty());
            if !prompt_ok {
                return LineAction::Respond(err(
                    id,
                    -32602,
                    "image_generate requires a non-empty prompt",
                ));
            }
            let msg = BrokerMessage::ImageGenerate(BrokerImageGenerateRequest {
                token: ctx.token.clone(),
                input: arguments,
                wait_ms: ctx.wait_cap_ms,
            });
            let round_trip =
                Box::pin(async move { client_message_round_trip(&socket, &msg).await });
            register_and_spawn(inflight, id, None, round_trip, render_image_jobs).await
        }
        "image_get_result" => {
            let job_ids = match job_ids(&arguments) {
                Ok(ids) if !ids.is_empty() => ids,
                Ok(_) => {
                    return LineAction::Respond(err(
                        id,
                        -32602,
                        "image_get_result requires a non-empty job_ids array",
                    ))
                }
                Err(msg) => return LineAction::Respond(err(id, -32602, msg)),
            };
            let msg = BrokerMessage::ImageResult(BrokerImageResultRequest {
                token: ctx.token.clone(),
                job_ids,
                wait_ms: collect_wait(&arguments, ctx.wait_cap_ms),
            });
            let round_trip =
                Box::pin(async move { client_message_round_trip(&socket, &msg).await });
            register_and_spawn(inflight, id, None, round_trip, render_image_jobs).await
        }
        other => LineAction::Respond(err(id, -32602, format!("unknown tool: {other}"))),
    }
}

/// `job_ids`, trimmed and de-duplicated in order. A bare string is taken as a
/// one-element list: models pass one often enough.
fn job_ids(arguments: &Value) -> Result<Vec<String>, String> {
    let raw: Vec<&Value> = match arguments.get("job_ids") {
        Some(Value::Array(arr)) => arr.iter().collect(),
        Some(v @ Value::String(_)) => vec![v],
        None | Some(Value::Null) => Vec::new(),
        Some(_) => return Err("image_get_result job_ids must be an array of strings".into()),
    };
    let mut out: Vec<String> = Vec::new();
    for v in raw {
        let Some(s) = v.as_str() else {
            return Err("image_get_result job_ids must contain only strings".into());
        };
        let s = s.trim();
        if !s.is_empty() && !out.iter().any(|x| x == s) {
            out.push(s.to_string());
        }
    }
    Ok(out)
}

/// `ask_user_question` / `get_question_answer`: the answer, the user not
/// having answered yet (`pending`), or a question that is no longer there.
pub(super) fn render_ask_outcome(outcome: &Value) -> Value {
    if outcome.get("pending").and_then(Value::as_bool) == Some(true) {
        let question_id = outcome
            .get("question_id")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let text = format!(
            "The user has not answered yet; the question is still in front of them. Call \
             get_question_answer with question_id \"{question_id}\" to keep waiting for the \
             answer. Do not ask the question again, and do not message the user about waiting."
        );
        return json!({
            "content": [{ "type": "text", "text": text }],
            "isError": false,
            // Codex shows the model only `structuredContent`, so the
            // instruction rides there too, as `render_ask_result` does.
            "structuredContent": { "pending": true, "question_id": question_id, "hint": text },
        });
    }
    if outcome.get("gone").and_then(Value::as_bool) == Some(true) {
        let text = "That question is no longer waiting for an answer: it was withdrawn, or its \
                    answer was already collected. Proceed using your best judgment and \
                    reasonable defaults.";
        return json!({
            "content": [{ "type": "text", "text": text }],
            "isError": false,
            "structuredContent": { "gone": true, "hint": text },
        });
    }
    render_ask_result(outcome)
}

/// `image_generate` / `image_get_result`: one line per job, plus the preview
/// image of each finished one that has it. No `structuredContent`: Codex shows
/// the model only that when it is present, and would drop the image.
pub(crate) fn render_image_jobs(outcome: &Value) -> Value {
    if let Some(error) = outcome.get("error").and_then(Value::as_str) {
        return json!({
            "content": [{ "type": "text", "text": error }],
            "isError": true,
        });
    }
    let jobs = outcome
        .get("jobs")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut lines: Vec<String> = Vec::new();
    let mut images: Vec<Value> = Vec::new();
    let mut running: Vec<String> = Vec::new();
    let mut failed = 0usize;
    for job in &jobs {
        let job_id = job
            .get("job_id")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let secs = job
            .get("elapsed_ms")
            .and_then(Value::as_u64)
            .map(|ms| format!("{:.1} s", ms as f64 / 1000.0))
            .unwrap_or_default();
        match job.get("status").and_then(Value::as_str) {
            Some("completed") => {
                let path = job.get("path").and_then(Value::as_str).unwrap_or_default();
                let mut detail = Vec::new();
                if let (Some(w), Some(h)) = (
                    job.get("width").and_then(Value::as_u64),
                    job.get("height").and_then(Value::as_u64),
                ) {
                    detail.push(format!("{w}x{h}"));
                }
                if let Some(mime) = job.get("mime_type").and_then(Value::as_str) {
                    detail.push(mime.to_string());
                }
                if let Some(model) = job.get("model").and_then(Value::as_str) {
                    match job.get("service").and_then(Value::as_str) {
                        Some(service) if !service.is_empty() => {
                            detail.push(format!("{model} via {service}"))
                        }
                        _ => detail.push(model.to_string()),
                    }
                }
                if !secs.is_empty() {
                    detail.push(secs.clone());
                }
                let mut line = format!(
                    "Image saved to {path} ({}). job_id={job_id}",
                    detail.join(", ")
                );
                if let Some(revised) = job
                    .get("revised_prompt")
                    .and_then(Value::as_str)
                    .filter(|s| !s.trim().is_empty())
                {
                    line.push_str(&format!("\nThe service rewrote the prompt as: {revised}"));
                }
                if let Some(note) = job.get("note").and_then(Value::as_str) {
                    line.push_str(&format!("\n{note}"));
                }
                lines.push(line);
                if let Some(preview) = job.get("preview") {
                    if let (Some(data), Some(mime)) = (
                        preview.get("data").and_then(Value::as_str),
                        preview.get("mime_type").and_then(Value::as_str),
                    ) {
                        images.push(json!({ "type": "image", "data": data, "mimeType": mime }));
                    }
                }
            }
            Some("failed") => {
                failed += 1;
                let error = job
                    .get("error")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown error");
                lines.push(format!(
                    "Image generation failed (job_id={job_id}): {error}"
                ));
            }
            Some("running") => {
                running.push(job_id.to_string());
                lines.push(format!(
                    "Still generating (job_id={job_id}{}).",
                    if secs.is_empty() {
                        String::new()
                    } else {
                        format!(", {secs} so far")
                    }
                ));
            }
            _ => {
                failed += 1;
                lines.push(format!(
                    "Unknown job_id {job_id}: it was never started here, or its result is no \
                     longer kept."
                ));
            }
        }
    }
    if !running.is_empty() {
        let ids = serde_json::to_string(&running).unwrap_or_default();
        lines.push(format!(
            "Call image_get_result with job_ids {ids} to wait for the rest; do not start the \
             same image again. While you are only waiting, do not message the user about it."
        ));
    }
    let mut content = vec![json!({ "type": "text", "text": lines.join("\n") })];
    content.extend(images);
    json!({
        "content": content,
        "isError": !jobs.is_empty() && failed == jobs.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_wait_is_clamped_to_the_cap() {
        assert_eq!(cap_status_wait(None, Some(20_000)), None);
        assert_eq!(cap_status_wait(Some(0), Some(20_000)), Some(20_000));
        assert_eq!(cap_status_wait(Some(60_000), Some(20_000)), Some(20_000));
        assert_eq!(cap_status_wait(Some(5_000), Some(20_000)), Some(5_000));
        assert_eq!(cap_status_wait(Some(0), None), Some(0));
    }

    #[test]
    fn collect_waits_up_to_the_cap_by_default() {
        assert_eq!(collect_wait(&json!({}), Some(45_000)), Some(45_000));
        assert_eq!(
            collect_wait(&json!({ "wait_ms": 10_000 }), Some(45_000)),
            Some(10_000)
        );
        assert_eq!(collect_wait(&json!({ "wait_ms": 0 }), None), None);
        assert_eq!(collect_wait(&json!({}), None), None);
    }

    #[test]
    fn the_cap_is_written_into_the_waiting_tools() {
        let mut tools = json!([
            { "name": "get_delegation_status", "description": "Poll." },
            { "name": "ask_user_question", "description": "Ask." },
            { "name": "get_session_info", "description": "Info." },
        ]);
        note_wait_cap(&mut tools, 20_000);
        assert!(tools[0]["description"].as_str().unwrap().contains("20 s"));
        assert!(tools[1]["description"]
            .as_str()
            .unwrap()
            .contains("get_question_answer"));
        assert_eq!(tools[2]["description"], "Info.");
    }

    #[test]
    fn the_fork_schema_parses_and_names_its_tools() {
        let tools: Value = serde_json::from_str(FORK_TOOL_SCHEMA_JSON).unwrap();
        let names: Vec<&str> = tools
            .as_array()
            .unwrap()
            .iter()
            .map(|t| t["name"].as_str().unwrap())
            .collect();
        assert_eq!(
            names,
            ["get_question_answer", "image_generate", "image_get_result"]
        );
    }

    #[test]
    fn pending_answer_tells_the_agent_how_to_collect() {
        let rendered = render_ask_outcome(&json!({ "pending": true, "question_id": "q-1" }));
        let text = rendered["content"][0]["text"].as_str().unwrap();
        assert!(text.contains("get_question_answer"));
        assert!(text.contains("q-1"));
        assert!(!text.contains("dismissed"));
        assert_eq!(rendered["structuredContent"]["pending"], true);
        // Codex shows only `structuredContent`: the instruction must be there.
        let hint = rendered["structuredContent"]["hint"].as_str().unwrap();
        assert!(hint.contains("get_question_answer") && hint.contains("q-1"));
        let gone = render_ask_outcome(&json!({ "gone": true }));
        assert!(gone["structuredContent"]["hint"]
            .as_str()
            .unwrap()
            .contains("no longer waiting"));
    }

    #[test]
    fn an_answer_renders_as_ask_user_question_does() {
        let outcome = json!({
            "declined": false,
            "answers": [{ "question": "Which?", "header": "Pick", "multi_select": false,
                          "selected": ["A"] }]
        });
        assert_eq!(render_ask_outcome(&outcome), render_ask_result(&outcome));
    }

    #[test]
    fn finished_image_gives_path_and_preview_without_structured_content() {
        let rendered = render_image_jobs(&json!({ "jobs": [{
            "job_id": "img-1", "status": "completed", "elapsed_ms": 38_200,
            "path": "/work/hero.png", "width": 1536, "height": 1024,
            "mime_type": "image/png", "model": "gpt-image-2", "service": "OpenAI",
            "preview": { "data": "AAAA", "mime_type": "image/jpeg" }
        }]}));
        assert_eq!(rendered["isError"], false);
        assert!(rendered.get("structuredContent").is_none());
        let text = rendered["content"][0]["text"].as_str().unwrap();
        assert!(text.contains("/work/hero.png"));
        assert!(text.contains("1536x1024"));
        assert!(text.contains("job_id=img-1"));
        assert_eq!(rendered["content"][1]["type"], "image");
        assert_eq!(rendered["content"][1]["mimeType"], "image/jpeg");
    }

    #[test]
    fn running_image_points_at_image_get_result() {
        let rendered = render_image_jobs(&json!({ "jobs": [{
            "job_id": "img-2", "status": "running", "elapsed_ms": 20_000
        }]}));
        assert_eq!(rendered["isError"], false);
        let text = rendered["content"][0]["text"].as_str().unwrap();
        assert!(text.contains("job_id=img-2"));
        assert!(text.contains("image_get_result"));
        assert!(text.contains("[\"img-2\"]"));
    }

    #[test]
    fn all_failed_is_an_error() {
        let rendered = render_image_jobs(&json!({ "jobs": [{
            "job_id": "img-3", "status": "failed", "error": "400: bad prompt"
        }]}));
        assert_eq!(rendered["isError"], true);
        let rendered = render_image_jobs(&json!({ "error": "not configured" }));
        assert_eq!(rendered["isError"], true);
    }

    #[test]
    fn job_ids_accepts_a_bare_string() {
        assert_eq!(job_ids(&json!({ "job_ids": " a " })).unwrap(), vec!["a"]);
        assert_eq!(
            job_ids(&json!({ "job_ids": ["a", "b", "a", ""] })).unwrap(),
            vec!["a", "b"]
        );
        assert!(job_ids(&json!({ "job_ids": [1] })).is_err());
    }

    struct Collect(tokio::sync::Mutex<Vec<Value>>);

    #[async_trait]
    impl NotificationSink for Collect {
        async fn send(&self, message: Value) {
            self.0.lock().await.push(message);
        }
    }

    fn ctx_with(notifier: Notifier) -> CompanionContext {
        CompanionContext {
            parent_connection_id: "p".into(),
            socket_path: "/nonexistent".into(),
            token: "t".into(),
            features: super::super::companion::CompanionFeatures::parse(Some("ask")),
            custom_agents: Vec::new(),
            disabled_agents: Vec::new(),
            assistant_support: Default::default(),
            result_schema: Default::default(),
            wait_cap_ms: None,
            notifier,
        }
    }

    fn slow_call(secs: u64) -> LineAction {
        use super::super::companion::{ok, SpawnResult, SpawnedCall};
        LineAction::Spawn(SpawnedCall {
            request_id: json!(1),
            request_id_key: "1".into(),
            future: Box::pin(async move {
                tokio::time::sleep(Duration::from_secs(secs)).await;
                SpawnResult {
                    response: Some(ok(json!(1), json!({}))),
                    after_relay: None,
                }
            }),
        })
    }

    #[tokio::test(start_paused = true)]
    async fn progress_ticks_while_waiting_and_stops_with_the_answer() {
        let sink = Arc::new(Collect(Default::default()));
        let ctx = ctx_with(Notifier::new(sink.clone()));
        let params = json!({ "name": "x", "_meta": { "progressToken": "tok" } });
        let LineAction::Spawn(spawned) = with_progress(slow_call(25), &ctx, &params) else {
            panic!("still a spawned call");
        };
        let result = spawned.future.await;
        assert!(result.response.is_some());
        let sent = sink.0.lock().await.clone();
        assert_eq!(sent.len(), 2, "ticks at 10 s and 20 s: {sent:?}");
        assert_eq!(sent[0]["params"]["progressToken"], "tok");
        assert_eq!(sent[0]["params"]["progress"], 10);
        assert_eq!(sent[1]["params"]["progress"], 20);
    }

    #[tokio::test(start_paused = true)]
    async fn no_progress_without_a_token() {
        let sink = Arc::new(Collect(Default::default()));
        let ctx = ctx_with(Notifier::new(sink.clone()));
        let LineAction::Spawn(spawned) =
            with_progress(slow_call(25), &ctx, &json!({ "name": "x" }))
        else {
            panic!("still a spawned call");
        };
        spawned.future.await;
        assert!(sink.0.lock().await.is_empty());
    }
}

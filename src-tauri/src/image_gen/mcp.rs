//! What the codeg-mcp listener calls for the `image` tool group. Each answer
//! is the JSON the companion renders (`acp::delegation::fork_tools::
//! render_image_jobs`): `{"jobs": [...]}`, or `{"error": "..."}` for a call the
//! agent has to fix.

use std::path::Path;
use std::time::Duration;

use serde_json::{json, Value};

use super::cursor;
use super::jobs::{self, JobSpec, JobView};
use super::settings;

/// The usable models, for `image_generate`'s schema.
pub async fn models() -> Value {
    let settings = settings::runtime_settings();
    let usable = settings::usable_models(&settings);
    json!({
        "models": usable
            .iter()
            .map(|m| json!({ "model": m.model, "service": m.service.display_name() }))
            .collect::<Vec<_>>(),
        "default": usable.first().map(|m| m.model.clone()),
    })
}

/// `image_generate`: start a job and wait up to `wait` for it.
pub async fn generate(
    parent_connection_id: &str,
    _conversation_id: Option<i32>,
    cwd: &Path,
    input: Value,
    wait: Option<Duration>,
) -> Value {
    let key = cursor::key_of(cursor::GENERATE, &input);
    let outcome = match parse_spec(&input) {
        Ok(spec) => match jobs::start(parent_connection_id, cwd, spec) {
            Ok(job_id) => {
                jobs_json(jobs::wait(parent_connection_id, &[job_id], wait, with_preview()).await)
            }
            Err(error) => json!({ "error": error }),
        },
        Err(error) => json!({ "error": error }),
    };
    cursor::note(parent_connection_id, cursor::GENERATE, key, &outcome);
    outcome
}

/// `image_get_result`.
pub async fn wait_for(
    parent_connection_id: &str,
    job_ids: &[String],
    wait: Option<Duration>,
) -> Value {
    let outcome = jobs_json(jobs::wait(parent_connection_id, job_ids, wait, with_preview()).await);
    let key = cursor::key_of_job_ids(&mut job_ids.iter().map(String::as_str).collect());
    cursor::note(parent_connection_id, cursor::GET_RESULT, key, &outcome);
    outcome
}

fn with_preview() -> bool {
    settings::runtime_settings().send_preview
}

fn jobs_json(views: Vec<JobView>) -> Value {
    json!({ "jobs": views })
}

fn optional_string(input: &Value, field: &str) -> Result<Option<String>, String> {
    match input.get(field) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(s)) => Ok(Some(s.trim().to_string()).filter(|s| !s.is_empty())),
        Some(_) => Err(format!("{field} must be a string")),
    }
}

fn one_of(
    input: &Value,
    field: &str,
    allowed: &[&str],
    case_insensitive: bool,
) -> Result<Option<String>, String> {
    let Some(value) = optional_string(input, field)? else {
        return Ok(None);
    };
    let found = allowed.iter().find(|a| {
        if case_insensitive {
            a.eq_ignore_ascii_case(&value)
        } else {
            **a == value
        }
    });
    match found {
        Some(a) => Ok(Some(a.to_string())),
        None => Err(format!("{field} must be one of {}", allowed.join(", "))),
    }
}

/// Check `image_generate`'s arguments.
pub fn parse_spec(input: &Value) -> Result<JobSpec, String> {
    let prompt = optional_string(input, "prompt")?
        .ok_or_else(|| "image_generate requires a non-empty prompt".to_string())?;
    let size = optional_string(input, "size")?;
    if let Some(size) = &size {
        let valid = size
            .to_ascii_lowercase()
            .split_once('x')
            .is_some_and(|(w, h)| {
                w.trim().parse::<u32>().is_ok() && h.trim().parse::<u32>().is_ok()
            });
        if !valid {
            return Err("size must look like 1536x1024".to_string());
        }
    }
    let reference_images = match input.get("reference_images") {
        None | Some(Value::Null) => Vec::new(),
        Some(Value::Array(items)) => items
            .iter()
            .map(|v| {
                v.as_str()
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .ok_or_else(|| "reference_images must be a list of file paths".to_string())
            })
            .collect::<Result<Vec<_>, _>>()?,
        Some(Value::String(one)) if !one.trim().is_empty() => vec![one.trim().to_string()],
        Some(_) => return Err("reference_images must be a list of file paths".to_string()),
    };
    if reference_images.len() > 10 {
        return Err("reference_images takes at most 10 images".to_string());
    }
    Ok(JobSpec {
        prompt,
        model: optional_string(input, "model")?,
        aspect_ratio: one_of(
            input,
            "aspect_ratio",
            &["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"],
            false,
        )?,
        resolution: one_of(input, "resolution", &["1K", "2K", "4K"], true)?,
        size,
        quality: one_of(input, "quality", &["low", "medium", "high", "auto"], true)?,
        background: one_of(
            input,
            "background",
            &["auto", "transparent", "opaque"],
            true,
        )?,
        reference_images,
        output_path: optional_string(input, "output_path")?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_spec_checks_every_field() {
        let spec = parse_spec(&json!({
            "prompt": " a fox ",
            "aspect_ratio": "16:9",
            "resolution": "2k",
            "quality": "HIGH",
            "reference_images": ["a.png"],
            "output_path": "public/fox.png",
        }))
        .unwrap();
        assert_eq!(spec.prompt, "a fox");
        assert_eq!(spec.resolution.as_deref(), Some("2K"));
        assert_eq!(spec.quality.as_deref(), Some("high"));
        assert_eq!(spec.reference_images, vec!["a.png"]);

        assert!(parse_spec(&json!({ "prompt": "" })).is_err());
        assert!(parse_spec(&json!({ "prompt": "x", "aspect_ratio": "5:4" })).is_err());
        assert!(parse_spec(&json!({ "prompt": "x", "size": "big" })).is_err());
        assert!(parse_spec(&json!({ "prompt": "x", "reference_images": [1] })).is_err());
    }
}

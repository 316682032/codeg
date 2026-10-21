//! Image jobs: started by `image_generate`, collected by `image_get_result`,
//! watched by the chat card.
//!
//! A job runs to the end whatever happens to the call that started it — an
//! agent's tool-call deadline, a cancel, the agent moving on — and its result
//! is kept for [`KEEP_FOR`] after it finishes. Ids are fresh UUIDs; collecting
//! one is limited to the connection that started it.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tokio::sync::Notify;

use super::credentials;
use super::files::{self, EncodedImage, OutputTarget, SavedImage};
use super::providers::{self, GenerateRequest};
use super::settings::{self, ImageService};

const KEEP_FOR: Duration = Duration::from_secs(60 * 60);

/// What `image_generate` asked for, checked.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct JobSpec {
    pub prompt: String,
    pub model: Option<String>,
    pub aspect_ratio: Option<String>,
    pub resolution: Option<String>,
    pub size: Option<String>,
    pub quality: Option<String>,
    pub background: Option<String>,
    pub reference_images: Vec<String>,
    pub output_path: Option<String>,
}

#[derive(Debug, Clone)]
enum JobState {
    Running,
    Completed {
        saved: SavedImage,
        revised_prompt: Option<String>,
        note: Option<String>,
        preview: Option<EncodedImage>,
    },
    Failed {
        error: String,
    },
}

#[derive(Debug, Clone)]
struct Job {
    parent_connection_id: String,
    prompt: String,
    model: String,
    service: String,
    started: Instant,
    started_at_ms: i64,
    elapsed: Option<Duration>,
    state: JobState,
}

/// A job as the agent and the chat card see it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct JobView {
    pub job_id: String,
    /// `running`, `completed`, `failed`, or `unknown`.
    pub status: &'static str,
    pub elapsed_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub service: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<PathBuf>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revised_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<EncodedImage>,
}

impl JobView {
    fn unknown(job_id: &str) -> Self {
        Self {
            job_id: job_id.to_string(),
            status: "unknown",
            elapsed_ms: 0,
            started_at_ms: None,
            prompt: None,
            model: None,
            service: None,
            path: None,
            width: None,
            height: None,
            mime_type: None,
            revised_prompt: None,
            note: None,
            error: None,
            preview: None,
        }
    }

    pub fn is_terminal(&self) -> bool {
        self.status != "running"
    }
}

fn view(job_id: &str, job: &Job, with_preview: bool) -> JobView {
    let elapsed = job.elapsed.unwrap_or_else(|| job.started.elapsed());
    let mut v = JobView {
        status: "running",
        elapsed_ms: elapsed.as_millis() as u64,
        started_at_ms: Some(job.started_at_ms),
        prompt: Some(job.prompt.clone()),
        model: Some(job.model.clone()),
        service: Some(job.service.clone()),
        ..JobView::unknown(job_id)
    };
    match &job.state {
        JobState::Running => {}
        JobState::Completed {
            saved,
            revised_prompt,
            note,
            preview,
        } => {
            v.status = "completed";
            v.path = Some(saved.path.clone());
            v.width = Some(saved.width);
            v.height = Some(saved.height);
            v.mime_type = Some(saved.mime_type.clone());
            v.revised_prompt = revised_prompt.clone();
            v.note = note.clone();
            if with_preview {
                v.preview = preview.clone();
            }
        }
        JobState::Failed { error } => {
            v.status = "failed";
            v.error = Some(error.clone());
        }
    }
    v
}

static JOBS: LazyLock<Mutex<HashMap<String, Job>>> = LazyLock::new(|| Mutex::new(HashMap::new()));
static CHANGED: LazyLock<Notify> = LazyLock::new(Notify::new);

fn jobs() -> std::sync::MutexGuard<'static, HashMap<String, Job>> {
    JOBS.lock().unwrap_or_else(|e| e.into_inner())
}

/// Check the request, then start the job in the background. Errors here are
/// the agent's to fix (an unknown model, a missing reference image, a bad
/// path) and nothing is started.
pub fn start(parent_connection_id: &str, cwd: &Path, spec: JobSpec) -> Result<String, String> {
    let settings = settings::runtime_settings();
    if !settings.enabled {
        return Err("Image generation is switched off in Codeg's settings.".to_string());
    }
    let picked = settings::pick_model(&settings, spec.model.as_deref())?;
    let api_key = credentials::load()
        .get(&picked.service.id)
        .cloned()
        .unwrap_or_default();
    if api_key.is_empty() {
        return Err(format!(
            "{} has no API key in Codeg's settings.",
            picked.service.display_name()
        ));
    }
    let job_id = format!("img-{}", uuid::Uuid::new_v4().simple());
    let target = files::resolve_output(
        spec.output_path.as_deref(),
        cwd,
        &settings.save_root(),
        &spec.prompt,
        &job_id,
    )?;
    if spec.background.as_deref() == Some("transparent")
        && target.format == Some(files::OutputFormat::Jpeg)
    {
        return Err(
            "A transparent background needs a .png or .webp output_path; JPEG has no transparency."
                .to_string(),
        );
    }
    let references = spec
        .reference_images
        .iter()
        .map(|p| files::read_reference(p, cwd))
        .collect::<Result<Vec<_>, _>>()?;
    let request = GenerateRequest {
        prompt: spec.prompt.clone(),
        aspect_ratio: spec.aspect_ratio.clone(),
        resolution: spec.resolution.clone(),
        size: spec.size.clone(),
        quality: spec.quality.clone(),
        background: spec.background.clone(),
        output_format: target.format.map(|f| f.api_name().to_string()),
        references,
    };
    {
        let mut map = jobs();
        // Finished jobs are kept for KEEP_FOR after they finished.
        map.retain(|_, job| match job.elapsed {
            None => true,
            Some(took) => job.started.elapsed() < took + KEEP_FOR,
        });
        map.insert(
            job_id.clone(),
            Job {
                parent_connection_id: parent_connection_id.to_string(),
                prompt: spec.prompt.clone(),
                model: picked.model.clone(),
                service: picked.service.display_name(),
                started: Instant::now(),
                started_at_ms: chrono::Utc::now().timestamp_millis(),
                elapsed: None,
                state: JobState::Running,
            },
        );
    }
    let id = job_id.clone();
    tokio::spawn(async move {
        let state = run(&picked.service, &picked.model, &api_key, &request, target).await;
        finish(&id, state);
    });
    Ok(job_id)
}

async fn run(
    service: &ImageService,
    model: &str,
    api_key: &str,
    request: &GenerateRequest,
    target: OutputTarget,
) -> JobState {
    let generated = match providers::generate(service, model, api_key, request).await {
        Ok(g) => g,
        Err(error) => return JobState::Failed { error },
    };
    let note = generated.text.clone();
    let revised_prompt = generated.revised_prompt.clone();
    let saved = tokio::task::spawn_blocking(move || {
        let saved = files::save(&generated.bytes, &target)?;
        let preview = files::preview(&generated.bytes).ok();
        Ok::<_, String>((saved, preview))
    })
    .await;
    match saved {
        Ok(Ok((saved, preview))) => JobState::Completed {
            saved,
            revised_prompt,
            note,
            preview,
        },
        Ok(Err(error)) => JobState::Failed { error },
        Err(e) => JobState::Failed {
            error: format!("saving the image failed: {e}"),
        },
    }
}

fn finish(job_id: &str, state: JobState) {
    if let Some(job) = jobs().get_mut(job_id) {
        job.elapsed = Some(job.started.elapsed());
        job.state = state;
    }
    CHANGED.notify_waiters();
}

/// The connection's jobs among `job_ids`, once one has finished or `wait`
/// (`None`: until one finishes) is up. Ids it did not start read `unknown`.
pub async fn wait(
    parent_connection_id: &str,
    job_ids: &[String],
    wait: Option<Duration>,
    with_preview: bool,
) -> Vec<JobView> {
    let deadline = wait.map(|w| tokio::time::Instant::now() + w);
    loop {
        let notified = CHANGED.notified();
        tokio::pin!(notified);
        notified.as_mut().enable();
        let views: Vec<JobView> = {
            let map = jobs();
            job_ids
                .iter()
                .map(|id| match map.get(id) {
                    Some(job) if job.parent_connection_id == parent_connection_id => {
                        view(id, job, with_preview)
                    }
                    _ => JobView::unknown(id),
                })
                .collect()
        };
        if views.iter().any(JobView::is_terminal) {
            return views;
        }
        match deadline {
            Some(deadline) => {
                if tokio::time::Instant::now() >= deadline {
                    return views;
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

/// One job, for the chat card (no preview; the card loads the file).
pub fn status(job_id: &str) -> JobView {
    match jobs().get(job_id) {
        Some(job) => view(job_id, job, false),
        None => JobView::unknown(job_id),
    }
}

#[cfg(test)]
pub(crate) fn insert_finished_for_test(job_id: &str, parent: &str, path: PathBuf) {
    jobs().insert(
        job_id.to_string(),
        Job {
            parent_connection_id: parent.to_string(),
            prompt: "p".into(),
            model: "m".into(),
            service: "s".into(),
            started: Instant::now(),
            started_at_ms: 0,
            elapsed: Some(Duration::from_millis(1500)),
            state: JobState::Completed {
                saved: SavedImage {
                    path,
                    width: 1,
                    height: 1,
                    mime_type: "image/png".into(),
                },
                revised_prompt: None,
                note: None,
                preview: None,
            },
        },
    );
    CHANGED.notify_waiters();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn only_the_starting_connection_sees_a_job() {
        insert_finished_for_test("img-owned", "conn-a", PathBuf::from("/x.png"));
        let mine = wait(
            "conn-a",
            &["img-owned".to_string()],
            Some(Duration::ZERO),
            false,
        )
        .await;
        assert_eq!(mine[0].status, "completed");
        assert_eq!(mine[0].elapsed_ms, 1500);
        let theirs = wait(
            "conn-b",
            &["img-owned".to_string()],
            Some(Duration::ZERO),
            false,
        )
        .await;
        assert_eq!(theirs[0].status, "unknown");
        assert_eq!(status("img-owned").status, "completed");
    }

    #[tokio::test]
    async fn a_running_job_is_reported_at_the_deadline_and_wakes_on_finish() {
        jobs().insert(
            "img-run".into(),
            Job {
                parent_connection_id: "conn-a".into(),
                prompt: "p".into(),
                model: "m".into(),
                service: "s".into(),
                started: Instant::now(),
                started_at_ms: 0,
                elapsed: None,
                state: JobState::Running,
            },
        );
        let early = wait(
            "conn-a",
            &["img-run".to_string()],
            Some(Duration::from_millis(20)),
            false,
        )
        .await;
        assert_eq!(early[0].status, "running");
        let waiter =
            tokio::spawn(async { wait("conn-a", &["img-run".to_string()], None, false).await });
        tokio::time::sleep(Duration::from_millis(20)).await;
        finish(
            "img-run",
            JobState::Failed {
                error: "HTTP 500: boom".into(),
            },
        );
        let done = tokio::time::timeout(Duration::from_secs(5), waiter)
            .await
            .expect("woken")
            .unwrap();
        assert_eq!(done[0].status, "failed");
        assert_eq!(done[0].error.as_deref(), Some("HTTP 500: boom"));
    }
}

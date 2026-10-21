//! Image generation for agents (keh4l build).
//!
//! The person configures image services in Settings → Image generation: each
//! one an interface kind (the OpenAI images API, which xAI and most relays
//! also speak, or Gemini's `generateContent`), an address (empty for the
//! official one), an API key and the model names to offer. Agents reach them
//! through the codeg-mcp `image` group (`image_generate` / `image_get_result`,
//! see `acp::delegation::fork_tools`): codeg calls the service itself, so the
//! key never leaves this process.
//!
//! Generating takes from seconds to minutes, longer than some agents let one
//! tool call run, so it is a job: `image_generate` starts it and waits as long
//! as the agent allows, and `image_get_result` collects it by id. The job runs
//! to the end whether or not anyone is still waiting.
//!
//! - [`settings`]: what is configured, persisted in one `app_metadata` row.
//! - [`credentials`]: the API keys, in the OS keyring (`tokens.json` on a
//!   server), never in the database.
//! - [`client`] / [`providers`]: the HTTP calls.
//! - [`files`]: where the image is written, format conversion, previews.
//! - [`jobs`]: the running and finished jobs.
//! - [`mcp`]: what the codeg-mcp listener calls.
//! - [`cursor`]: those answers again, for Cursor's live view.

pub mod client;
pub mod credentials;
pub mod cursor;
pub mod files;
pub mod jobs;
pub mod mcp;
pub mod providers;
pub mod settings;

pub use settings::{is_ready, runtime_settings, set_runtime_settings};

//! The HTTP client image requests go through.
//!
//! One pooled client, built from the proxy the environment names (the app's
//! proxy setting is applied there) and rebuilt when that changes, like
//! `forge::http_client`. Unlike translation there is no direct-first route:
//! the image services are mostly abroad, where the proxy is the way out.

use std::sync::RwLock;
use std::time::Duration;

type ProxyKeyedClient = (Vec<(String, String)>, reqwest::Client);

static CLIENT: RwLock<Option<ProxyKeyedClient>> = RwLock::new(None);

/// A whole generation is one request, and a large image at high quality can
/// take a few minutes.
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(300);

pub fn client() -> Result<reqwest::Client, String> {
    let mut fingerprint = crate::network::proxy::current_proxy_env_vars();
    fingerprint.extend(crate::network::proxy::current_no_proxy_env_vars());
    if let Ok(guard) = CLIENT.read() {
        if let Some((cached, client)) = guard.as_ref() {
            if *cached == fingerprint {
                return Ok(client.clone());
            }
        }
    }
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .timeout(REQUEST_TIMEOUT)
        .user_agent(concat!("codeg/", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|e| format!("http client build failed: {e}"))?;
    if let Ok(mut guard) = CLIENT.write() {
        *guard = Some((fingerprint, client.clone()));
    }
    Ok(client)
}

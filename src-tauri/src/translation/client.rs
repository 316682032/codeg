//! The HTTP clients translation requests go through.
//!
//! Direct first, always: both engines are in mainland China, and a proxy that
//! routes them abroad added ~0.7s to every TokenHub request (measured
//! 2026-10-15). A network that only lets traffic out through a proxy still
//! works without a setting: a request that cannot connect directly goes again
//! through the proxy the environment names, and for a while after that the
//! proxy is tried first, so every request does not wait out a failed connect.
//!
//! One pooled client per route, so consecutive requests reuse the connection
//! instead of paying a TLS handshake each time. The proxied one follows the
//! same rebuild-on-proxy-change rule as `forge::http_client`.

use std::sync::{Mutex, OnceLock, RwLock};
use std::time::{Duration, Instant};

type ProxyKeyedClient = (Vec<(String, String)>, reqwest::Client);

static PROXIED: RwLock<Option<ProxyKeyedClient>> = RwLock::new(None);
static DIRECT: OnceLock<reqwest::Client> = OnceLock::new();
/// Until when the proxy goes first, after a direct connect failed and the
/// proxy got through.
static PREFER_PROXY_UNTIL: Mutex<Option<Instant>> = Mutex::new(None);
const PREFER_PROXY_FOR: Duration = Duration::from_secs(10 * 60);

fn builder() -> reqwest::ClientBuilder {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(8))
        // A whole reply in one call: 6,000 characters took qwen-mt-flash
        // ~6s, and hy-mt2 is slower.
        .timeout(Duration::from_secs(60))
        .user_agent(concat!("codeg/", env!("CARGO_PKG_VERSION")))
}

/// The routes a request may take: direct, and the environment's proxy when
/// one is set.
#[derive(Clone)]
pub struct Clients {
    direct: reqwest::Client,
    proxied: Option<reqwest::Client>,
}

pub fn clients() -> Result<Clients, String> {
    let direct = match DIRECT.get() {
        Some(client) => client.clone(),
        None => {
            let client = builder()
                .no_proxy()
                .build()
                .map_err(|e| format!("http client build failed: {e}"))?;
            DIRECT.get_or_init(|| client).clone()
        }
    };
    Ok(Clients {
        direct,
        proxied: proxied_client()?,
    })
}

fn proxied_client() -> Result<Option<reqwest::Client>, String> {
    let proxies = crate::network::proxy::current_proxy_env_vars();
    if proxies.is_empty() {
        return Ok(None);
    }
    let mut fingerprint = proxies;
    fingerprint.extend(crate::network::proxy::current_no_proxy_env_vars());
    if let Ok(guard) = PROXIED.read() {
        if let Some((cached, client)) = guard.as_ref() {
            if *cached == fingerprint {
                return Ok(Some(client.clone()));
            }
        }
    }
    let client = builder()
        .build()
        .map_err(|e| format!("http client build failed: {e}"))?;
    if let Ok(mut guard) = PROXIED.write() {
        *guard = Some((fingerprint, client.clone()));
    }
    Ok(Some(client))
}

fn prefer_proxy() -> bool {
    PREFER_PROXY_UNTIL
        .lock()
        .ok()
        .and_then(|until| *until)
        .is_some_and(|until| Instant::now() < until)
}

fn set_prefer_proxy(on: bool) {
    if let Ok(mut until) = PREFER_PROXY_UNTIL.lock() {
        *until = on.then(|| Instant::now() + PREFER_PROXY_FOR);
    }
}

/// Send the request `build` makes, direct first (proxy first for a while after
/// only the proxy could connect), moving to the other route only when the
/// first could not connect at all — a response of any kind, or a timeout once
/// connected, is the answer.
pub async fn send(
    clients: &Clients,
    build: impl Fn(&reqwest::Client) -> reqwest::RequestBuilder,
) -> Result<reqwest::Response, reqwest::Error> {
    let Some(proxied) = &clients.proxied else {
        return build(&clients.direct).send().await;
    };
    let proxy_first = prefer_proxy();
    let (first, second) = if proxy_first {
        (proxied, &clients.direct)
    } else {
        (&clients.direct, proxied)
    };
    match build(first).send().await {
        Err(err) if err.is_connect() => {
            tracing::info!(
                "[TRANSLATION] {} connect failed, trying {}: {err}",
                if proxy_first { "proxy" } else { "direct" },
                if proxy_first { "direct" } else { "proxy" },
            );
            let result = build(second).send().await;
            if result.is_ok() {
                set_prefer_proxy(!proxy_first);
            }
            result
        }
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A port nothing listens on: a connect there is refused at once.
    fn closed_port() -> std::net::SocketAddr {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        listener.local_addr().unwrap()
    }

    #[tokio::test]
    async fn a_request_that_cannot_connect_directly_goes_through_the_proxy() {
        // Stands in for the proxy: it answers the forwarded request itself.
        let app = axum::Router::new().route("/ping", axum::routing::get(|| async { "pong" }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let proxy = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        let clients = Clients {
            direct: builder().no_proxy().build().unwrap(),
            proxied: Some(
                builder()
                    .proxy(reqwest::Proxy::http(format!("http://{proxy}")).unwrap())
                    .build()
                    .unwrap(),
            ),
        };
        set_prefer_proxy(false);

        let url = format!("http://{}/ping", closed_port());
        let response = send(&clients, |client| client.get(&url))
            .await
            .expect("through the proxy");
        assert_eq!(response.text().await.unwrap(), "pong");
        assert!(prefer_proxy(), "the proxy goes first for a while");
        set_prefer_proxy(false);
    }

    #[tokio::test]
    async fn without_a_proxy_a_failed_connect_is_the_answer() {
        let clients = Clients {
            direct: builder().no_proxy().build().unwrap(),
            proxied: None,
        };
        let url = format!("http://{}/ping", closed_port());
        let err = send(&clients, |client| client.get(&url))
            .await
            .expect_err("nothing listens there");
        assert!(err.is_connect());
    }
}

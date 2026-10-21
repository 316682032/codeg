//! The two wire formats image services speak.
//!
//! - **OpenAI images API** (`ServiceKind::Openai`): `POST {base}/images/generations`,
//!   or `/images/edits` with reference images. xAI serves the same paths but
//!   takes `aspect_ratio` / `resolution` instead of `size`, and edits as JSON
//!   rather than multipart, so a `grok-*` model or an `x.ai` address switches
//!   to that dialect. Images come back as `b64_json`, or a `url` (some relays)
//!   that is fetched at once, before it expires.
//! - **Gemini** (`ServiceKind::Gemini`): `POST {base}/models/{model}:generateContent`
//!   with `responseModalities` including `IMAGE`; reference images go in as
//!   `inline_data` parts and the image comes back as an `inlineData` part.
//!   Google's OpenAI-compatible endpoint does not serve the current image
//!   models, so this is the native API.
//!
//! Parameters a service does not take are left out rather than sent: models
//! behind relays differ in what they accept, and a refused parameter fails the
//! whole request.

use base64::Engine as _;
use serde_json::{json, Value};

use super::client;
use super::settings::{ImageService, ServiceKind};

/// What to generate, already checked and with reference images read.
#[derive(Debug, Clone, Default)]
pub struct GenerateRequest {
    pub prompt: String,
    pub aspect_ratio: Option<String>,
    /// `1K`, `2K` or `4K`.
    pub resolution: Option<String>,
    /// `WIDTHxHEIGHT`.
    pub size: Option<String>,
    pub quality: Option<String>,
    pub background: Option<String>,
    /// `png`, `jpeg` or `webp`, when the file asked for one; sent only to
    /// models known to take it, and otherwise converted afterwards.
    pub output_format: Option<String>,
    pub references: Vec<ReferenceImage>,
}

#[derive(Debug, Clone)]
pub struct ReferenceImage {
    pub bytes: Vec<u8>,
    pub mime_type: String,
    pub file_name: String,
}

#[derive(Debug, Clone)]
pub struct Generated {
    pub bytes: Vec<u8>,
    /// The prompt the service actually used, when it rewrote it.
    pub revised_prompt: Option<String>,
    /// Text the model returned alongside the image (Gemini).
    pub text: Option<String>,
}

pub async fn generate(
    service: &ImageService,
    model: &str,
    api_key: &str,
    req: &GenerateRequest,
) -> Result<Generated, String> {
    let http = client::client()?;
    match service.kind {
        ServiceKind::Openai => openai(&http, service, model, api_key, req).await,
        ServiceKind::Gemini => gemini(&http, service, model, api_key, req).await,
    }
}

fn b64() -> base64::engine::GeneralPurpose {
    base64::engine::general_purpose::STANDARD
}

fn is_xai(service: &ImageService, model: &str) -> bool {
    model.to_ascii_lowercase().starts_with("grok")
        || reqwest::Url::parse(service.effective_base_url())
            .ok()
            .and_then(|u| u.host_str().map(|h| h.ends_with("x.ai")))
            .unwrap_or(false)
}

/// GPT image models take `output_format`, `quality` and `background`.
fn is_gpt_image(model: &str) -> bool {
    model.to_ascii_lowercase().starts_with("gpt-image")
}

const ASPECT_RATIOS: [(&str, f64); 8] = [
    ("1:1", 1.0),
    ("3:2", 1.5),
    ("2:3", 2.0 / 3.0),
    ("4:3", 4.0 / 3.0),
    ("3:4", 0.75),
    ("16:9", 16.0 / 9.0),
    ("9:16", 9.0 / 16.0),
    ("21:9", 21.0 / 9.0),
];

fn parse_size(size: &str) -> Option<(u32, u32)> {
    let (w, h) = size
        .trim()
        .to_ascii_lowercase()
        .split_once('x')
        .map(|(w, h)| (w.trim().parse::<u32>().ok(), h.trim().parse::<u32>().ok()))?;
    Some((w?, h?)).filter(|(w, h)| *w > 0 && *h > 0)
}

fn ratio_value(aspect: &str) -> Option<f64> {
    ASPECT_RATIOS
        .iter()
        .find(|(name, _)| *name == aspect)
        .map(|(_, v)| *v)
}

/// The listed aspect ratio closest to `width / height`.
fn nearest_aspect(width: u32, height: u32) -> &'static str {
    let target = width as f64 / height as f64;
    ASPECT_RATIOS
        .iter()
        .min_by(|a, b| {
            (a.1.ln() - target.ln())
                .abs()
                .total_cmp(&(b.1.ln() - target.ln()).abs())
        })
        .map(|(name, _)| *name)
        .unwrap_or("1:1")
}

/// The `size` for an OpenAI-style model. An explicit size wins. At the
/// default resolution the three sizes every GPT image model accepts are
/// used; 2K and 4K compute a size on 16-pixel steps, which the newer models
/// take.
fn openai_size(req: &GenerateRequest) -> Option<String> {
    if let Some((w, h)) = req.size.as_deref().and_then(parse_size) {
        return Some(format!("{w}x{h}"));
    }
    let ratio = req.aspect_ratio.as_deref().and_then(ratio_value);
    let long_edge = match req.resolution.as_deref() {
        Some("2K") => Some(2048.0),
        Some("4K") => Some(3840.0),
        _ => None,
    };
    match (ratio, long_edge) {
        (None, None) => None,
        (ratio, None) => {
            let ratio = ratio.unwrap_or(1.0);
            Some(
                if (ratio - 1.0).abs() < 0.01 {
                    "1024x1024"
                } else if ratio > 1.0 {
                    "1536x1024"
                } else {
                    "1024x1536"
                }
                .to_string(),
            )
        }
        (ratio, Some(long)) => {
            let ratio = ratio.unwrap_or(1.0);
            let (w, h) = if ratio >= 1.0 {
                (long, long / ratio)
            } else {
                (long * ratio, long)
            };
            let snap = |v: f64| ((v / 16.0).round() as u32).max(1) * 16;
            Some(format!("{}x{}", snap(w), snap(h)))
        }
    }
}

/// `1k` / `2k` for xAI (it has no 4K).
fn xai_resolution(req: &GenerateRequest) -> Option<&'static str> {
    match req.resolution.as_deref() {
        Some("1K") => Some("1k"),
        Some("2K") | Some("4K") => Some("2k"),
        _ => None,
    }
}

fn data_uri(image: &ReferenceImage) -> String {
    format!(
        "data:{};base64,{}",
        image.mime_type,
        b64().encode(&image.bytes)
    )
}

async fn openai(
    http: &reqwest::Client,
    service: &ImageService,
    model: &str,
    api_key: &str,
    req: &GenerateRequest,
) -> Result<Generated, String> {
    let base = service.effective_base_url();
    let xai = is_xai(service, model);
    let gpt_image = is_gpt_image(model);
    let editing = !req.references.is_empty();
    let url = format!(
        "{base}/images/{}",
        if editing { "edits" } else { "generations" }
    );

    let response = if editing && !xai {
        let mut form = reqwest::multipart::Form::new()
            .text("model", model.to_string())
            .text("prompt", req.prompt.clone())
            .text("n", "1");
        if let Some(size) = openai_size(req) {
            form = form.text("size", size);
        }
        if let Some(quality) = &req.quality {
            form = form.text("quality", quality.clone());
        }
        if let Some(background) = &req.background {
            form = form.text("background", background.clone());
        }
        if gpt_image {
            if let Some(format) = &req.output_format {
                form = form.text("output_format", format.clone());
            }
        }
        let field = if req.references.len() == 1 {
            "image"
        } else {
            "image[]"
        };
        for image in &req.references {
            let part = reqwest::multipart::Part::bytes(image.bytes.clone())
                .file_name(image.file_name.clone())
                .mime_str(&image.mime_type)
                .map_err(|e| format!("reference image {}: {e}", image.file_name))?;
            form = form.part(field, part);
        }
        http.post(&url)
            .bearer_auth(api_key)
            .multipart(form)
            .send()
            .await
    } else {
        let mut body = json!({ "model": model, "prompt": req.prompt, "n": 1 });
        if xai {
            if let Some(aspect) = req.aspect_ratio.clone().or_else(|| {
                req.size
                    .as_deref()
                    .and_then(parse_size)
                    .map(|(w, h)| nearest_aspect(w, h).to_string())
            }) {
                body["aspect_ratio"] = json!(aspect);
            }
            if let Some(resolution) = xai_resolution(req) {
                body["resolution"] = json!(resolution);
            }
            body["response_format"] = json!("b64_json");
            match req.references.as_slice() {
                [] => {}
                [one] => body["image"] = json!({ "url": data_uri(one) }),
                many => {
                    body["images"] = json!(many
                        .iter()
                        .map(|i| json!({ "url": data_uri(i) }))
                        .collect::<Vec<_>>())
                }
            }
        } else {
            if let Some(size) = openai_size(req) {
                body["size"] = json!(size);
            }
            if let Some(quality) = &req.quality {
                body["quality"] = json!(quality);
            }
            if let Some(background) = &req.background {
                body["background"] = json!(background);
            }
            if gpt_image {
                if let Some(format) = &req.output_format {
                    body["output_format"] = json!(format);
                }
            }
        }
        http.post(&url)
            .bearer_auth(api_key)
            .json(&body)
            .send()
            .await
    };
    let body = read_json(response.map_err(request_error)?).await?;
    let first = body
        .get("data")
        .and_then(Value::as_array)
        .and_then(|d| d.first())
        .ok_or_else(|| {
            format!(
                "the service returned no image: {}",
                excerpt(&body.to_string())
            )
        })?;
    let revised_prompt = first
        .get("revised_prompt")
        .and_then(Value::as_str)
        .map(str::to_string);
    let bytes = if let Some(data) = first.get("b64_json").and_then(Value::as_str) {
        decode_b64(data)?
    } else if let Some(url) = first.get("url").and_then(Value::as_str) {
        download(http, url).await?
    } else {
        return Err(format!(
            "the service returned no image data: {}",
            excerpt(&first.to_string())
        ));
    };
    Ok(Generated {
        bytes,
        revised_prompt,
        text: None,
    })
}

async fn gemini(
    http: &reqwest::Client,
    service: &ImageService,
    model: &str,
    api_key: &str,
    req: &GenerateRequest,
) -> Result<Generated, String> {
    let base = service.effective_base_url();
    let model = model.strip_prefix("models/").unwrap_or(model);
    let url = format!("{base}/models/{model}:generateContent");
    let mut parts = vec![json!({ "text": req.prompt })];
    for image in &req.references {
        parts.push(json!({
            "inline_data": { "mime_type": image.mime_type, "data": b64().encode(&image.bytes) }
        }));
    }
    let mut image_config = serde_json::Map::new();
    let aspect = req.aspect_ratio.clone().or_else(|| {
        req.size
            .as_deref()
            .and_then(parse_size)
            .map(|(w, h)| nearest_aspect(w, h).to_string())
    });
    if let Some(aspect) = aspect {
        image_config.insert("aspectRatio".into(), json!(aspect));
    }
    if let Some(resolution) = &req.resolution {
        image_config.insert("imageSize".into(), json!(resolution));
    }
    let mut generation_config = json!({ "responseModalities": ["TEXT", "IMAGE"] });
    if !image_config.is_empty() {
        generation_config["imageConfig"] = Value::Object(image_config);
    }
    let body = json!({
        "contents": [{ "role": "user", "parts": parts }],
        "generationConfig": generation_config,
    });
    let official = reqwest::Url::parse(base)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.ends_with("googleapis.com")))
        .unwrap_or(false);
    let mut request = http
        .post(&url)
        .header("x-goog-api-key", api_key)
        .json(&body);
    // Relays usually authenticate with a bearer token; Google rejects one
    // that is not an OAuth token, so it only goes elsewhere.
    if !official {
        request = request.bearer_auth(api_key);
    }
    let body = read_json(request.send().await.map_err(request_error)?).await?;
    let candidate_parts = body
        .pointer("/candidates/0/content/parts")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let mut image: Option<Vec<u8>> = None;
    let mut texts: Vec<String> = Vec::new();
    for part in &candidate_parts {
        if part.get("thought").and_then(Value::as_bool) == Some(true) {
            continue;
        }
        let inline = part.get("inlineData").or_else(|| part.get("inline_data"));
        if let Some(data) = inline.and_then(|i| i.get("data")).and_then(Value::as_str) {
            if image.is_none() {
                image = Some(decode_b64(data)?);
            }
        } else if let Some(text) = part.get("text").and_then(Value::as_str) {
            if !text.trim().is_empty() {
                texts.push(text.trim().to_string());
            }
        }
    }
    let text = (!texts.is_empty()).then(|| texts.join("\n"));
    let Some(bytes) = image else {
        let reason = body
            .pointer("/promptFeedback/blockReason")
            .or_else(|| body.pointer("/candidates/0/finishReason"))
            .and_then(Value::as_str)
            .unwrap_or("none given");
        return Err(match text {
            Some(text) => format!(
                "the model returned no image (reason: {reason}). It said: {}",
                excerpt(&text)
            ),
            None => format!("the model returned no image (reason: {reason})"),
        });
    };
    Ok(Generated {
        bytes,
        revised_prompt: None,
        text,
    })
}

fn request_error(e: reqwest::Error) -> String {
    if e.is_timeout() {
        format!(
            "the service did not answer within {} s",
            client::REQUEST_TIMEOUT.as_secs()
        )
    } else if e.is_connect() {
        format!("could not connect to the service: {e}")
    } else {
        format!("request failed: {e}")
    }
}

/// The body as JSON, or the service's own error message for a non-2xx answer.
async fn read_json(response: reqwest::Response) -> Result<Value, String> {
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("reading the response failed: {e}"))?;
    let parsed = serde_json::from_str::<Value>(&text);
    if !status.is_success() {
        let message = parsed
            .ok()
            .and_then(|v| {
                v.pointer("/error/message")
                    .or_else(|| v.get("error").filter(|e| e.is_string()))
                    .or_else(|| v.get("message"))
                    .and_then(Value::as_str)
                    .map(str::to_string)
            })
            .unwrap_or_else(|| excerpt(&text));
        return Err(format!("HTTP {}: {message}", status.as_u16()));
    }
    parsed.map_err(|_| format!("the service did not return JSON: {}", excerpt(&text)))
}

async fn download(http: &reqwest::Client, url: &str) -> Result<Vec<u8>, String> {
    if let Some(rest) = url.strip_prefix("data:") {
        let data = rest.split_once(',').map(|(_, d)| d).unwrap_or(rest);
        return decode_b64(data);
    }
    let response = http
        .get(url)
        .send()
        .await
        .map_err(|e| format!("downloading the image failed: {e}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "downloading the image failed: HTTP {}",
            response.status().as_u16()
        ));
    }
    response
        .bytes()
        .await
        .map(|b| b.to_vec())
        .map_err(|e| format!("downloading the image failed: {e}"))
}

fn decode_b64(data: &str) -> Result<Vec<u8>, String> {
    let data = data
        .strip_prefix("data:")
        .and_then(|rest| rest.split_once(',').map(|(_, d)| d))
        .unwrap_or(data);
    b64()
        .decode(data.trim())
        .map_err(|e| format!("the service returned undecodable image data: {e}"))
}

fn excerpt(text: &str) -> String {
    let trimmed = text.trim();
    let mut out: String = trimmed.chars().take(300).collect();
    if trimmed.chars().count() > 300 {
        out.push('…');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::{Path, State};
    use axum::http::{HeaderMap, StatusCode};
    use axum::routing::post;
    use axum::{Json, Router};
    use std::sync::{Arc, Mutex};

    /// A 1×1 PNG.
    pub(crate) fn tiny_png() -> Vec<u8> {
        let img = image::RgbaImage::from_pixel(1, 1, image::Rgba([255, 0, 0, 255]));
        let mut out = std::io::Cursor::new(Vec::new());
        img.write_to(&mut out, image::ImageFormat::Png).unwrap();
        out.into_inner()
    }

    #[derive(Default)]
    struct Seen {
        bodies: Vec<Value>,
        headers: Vec<HeaderMap>,
        paths: Vec<String>,
    }

    async fn serve(router: Router) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, router).await.unwrap();
        });
        format!("http://{addr}")
    }

    fn openai_router(seen: Arc<Mutex<Seen>>) -> Router {
        Router::new()
            .route(
                "/v1/images/generations",
                post(
                    |State(seen): State<Arc<Mutex<Seen>>>, headers: HeaderMap, Json(body): Json<Value>| async move {
                        let mut s = seen.lock().unwrap();
                        s.bodies.push(body.clone());
                        s.headers.push(headers);
                        if body["prompt"] == "fail" {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(json!({ "error": { "message": "prompt rejected" } })),
                            );
                        }
                        let b64 = base64::engine::general_purpose::STANDARD.encode(tiny_png());
                        (
                            StatusCode::OK,
                            Json(json!({ "data": [{ "b64_json": b64, "revised_prompt": "a red dot" }] })),
                        )
                    },
                ),
            )
            .with_state(seen)
    }

    fn service(kind: ServiceKind, base: &str) -> ImageService {
        ImageService {
            id: "s".into(),
            name: String::new(),
            kind,
            base_url: base.into(),
            models: vec![],
        }
    }

    #[test]
    fn sizes_follow_ratio_and_resolution() {
        let req = |aspect: Option<&str>, res: Option<&str>, size: Option<&str>| GenerateRequest {
            aspect_ratio: aspect.map(str::to_string),
            resolution: res.map(str::to_string),
            size: size.map(str::to_string),
            ..Default::default()
        };
        assert_eq!(openai_size(&req(None, None, None)), None);
        assert_eq!(
            openai_size(&req(Some("1:1"), None, None)).as_deref(),
            Some("1024x1024")
        );
        assert_eq!(
            openai_size(&req(Some("16:9"), None, None)).as_deref(),
            Some("1536x1024")
        );
        assert_eq!(
            openai_size(&req(Some("9:16"), Some("1K"), None)).as_deref(),
            Some("1024x1536")
        );
        assert_eq!(
            openai_size(&req(Some("16:9"), Some("2K"), None)).as_deref(),
            Some("2048x1152")
        );
        assert_eq!(
            openai_size(&req(Some("16:9"), Some("4K"), None)).as_deref(),
            Some("3840x2160")
        );
        assert_eq!(
            openai_size(&req(Some("16:9"), None, Some("800x600"))).as_deref(),
            Some("800x600")
        );
        assert_eq!(nearest_aspect(1920, 1080), "16:9");
        assert_eq!(nearest_aspect(1000, 1000), "1:1");
    }

    #[tokio::test]
    async fn openai_generation_sends_only_given_parameters() {
        let seen = Arc::new(Mutex::new(Seen::default()));
        let base = serve(openai_router(seen.clone())).await;
        let svc = service(ServiceKind::Openai, &format!("{base}/v1"));
        let req = GenerateRequest {
            prompt: "a red dot".into(),
            aspect_ratio: Some("3:2".into()),
            output_format: Some("jpeg".into()),
            ..Default::default()
        };
        let out = generate(&svc, "gpt-image-2", "sk-test", &req)
            .await
            .unwrap();
        assert_eq!(out.bytes, tiny_png());
        assert_eq!(out.revised_prompt.as_deref(), Some("a red dot"));
        let s = seen.lock().unwrap();
        let body = &s.bodies[0];
        assert_eq!(body["model"], "gpt-image-2");
        assert_eq!(body["size"], "1536x1024");
        assert_eq!(body["output_format"], "jpeg");
        assert!(body.get("quality").is_none());
        assert!(body.get("response_format").is_none());
        assert_eq!(s.headers[0]["authorization"], "Bearer sk-test");
    }

    #[tokio::test]
    async fn grok_models_use_the_xai_dialect() {
        let seen = Arc::new(Mutex::new(Seen::default()));
        let base = serve(openai_router(seen.clone())).await;
        let svc = service(ServiceKind::Openai, &format!("{base}/v1"));
        let req = GenerateRequest {
            prompt: "a red dot".into(),
            aspect_ratio: Some("16:9".into()),
            resolution: Some("4K".into()),
            quality: Some("high".into()),
            ..Default::default()
        };
        generate(&svc, "grok-imagine-image-2.0", "xai-test", &req)
            .await
            .unwrap();
        let s = seen.lock().unwrap();
        let body = &s.bodies[0];
        assert_eq!(body["aspect_ratio"], "16:9");
        assert_eq!(body["resolution"], "2k");
        assert_eq!(body["response_format"], "b64_json");
        assert!(body.get("size").is_none());
        assert!(body.get("quality").is_none());
    }

    #[tokio::test]
    async fn a_service_error_carries_its_message() {
        let seen = Arc::new(Mutex::new(Seen::default()));
        let base = serve(openai_router(seen)).await;
        let svc = service(ServiceKind::Openai, &format!("{base}/v1"));
        let req = GenerateRequest {
            prompt: "fail".into(),
            ..Default::default()
        };
        let err = generate(&svc, "gpt-image-2", "k", &req).await.unwrap_err();
        assert_eq!(err, "HTTP 400: prompt rejected");
    }

    #[tokio::test]
    async fn gemini_reads_the_inline_image_and_skips_thoughts() {
        let seen = Arc::new(Mutex::new(Seen::default()));
        let router = Router::new()
            .route(
                "/v1beta/models/{model}",
                post(
                    |State(seen): State<Arc<Mutex<Seen>>>,
                     Path(model): Path<String>,
                     headers: HeaderMap,
                     Json(body): Json<Value>| async move {
                        let mut s = seen.lock().unwrap();
                        s.paths.push(model);
                        s.bodies.push(body);
                        s.headers.push(headers);
                        let b64 = base64::engine::general_purpose::STANDARD.encode(tiny_png());
                        Json(json!({ "candidates": [{ "content": { "parts": [
                            { "text": "thinking", "thought": true },
                            { "inlineData": { "mimeType": "image/png", "data": "!!", }, "thought": true },
                            { "text": "Here it is." },
                            { "inlineData": { "mimeType": "image/png", "data": b64 } }
                        ]}}]}))
                    },
                ),
            )
            .with_state(seen.clone());
        let base = serve(router).await;
        let svc = service(ServiceKind::Gemini, &format!("{base}/v1beta"));
        let req = GenerateRequest {
            prompt: "a red dot".into(),
            aspect_ratio: Some("16:9".into()),
            resolution: Some("2K".into()),
            references: vec![ReferenceImage {
                bytes: tiny_png(),
                mime_type: "image/png".into(),
                file_name: "ref.png".into(),
            }],
            ..Default::default()
        };
        let out = generate(&svc, "gemini-3-pro-image", "g-key", &req)
            .await
            .unwrap();
        assert_eq!(out.bytes, tiny_png());
        assert_eq!(out.text.as_deref(), Some("Here it is."));
        let s = seen.lock().unwrap();
        assert_eq!(s.paths[0], "gemini-3-pro-image:generateContent");
        let body = &s.bodies[0];
        assert_eq!(
            body["generationConfig"]["imageConfig"]["aspectRatio"],
            "16:9"
        );
        assert_eq!(body["generationConfig"]["imageConfig"]["imageSize"], "2K");
        assert_eq!(
            body["contents"][0]["parts"][1]["inline_data"]["mime_type"],
            "image/png"
        );
        assert_eq!(s.headers[0]["x-goog-api-key"], "g-key");
        // A relay (not googleapis.com) also gets the key as a bearer token.
        assert_eq!(s.headers[0]["authorization"], "Bearer g-key");
    }
}

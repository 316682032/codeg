use std::sync::{Arc, Mutex};

use axum::http::StatusCode;
use axum::routing::post;
use axum::Json;
use serde_json::{json, Value};

use super::*;
use crate::db::test_helpers::fresh_in_memory_db;
use crate::models::translation::TranslationSettings;

type Responder = Arc<dyn Fn(&Value) -> (StatusCode, Value) + Send + Sync>;

/// A chat-completions endpoint on an OS-assigned port that answers with
/// `respond` and records every request body.
async fn mock_engine(respond: Responder) -> (String, Arc<Mutex<Vec<Value>>>) {
    let seen = Arc::new(Mutex::new(Vec::new()));
    let recorder = seen.clone();
    let app = axum::Router::new().route(
        "/chat/completions",
        post(move |Json(body): Json<Value>| {
            let recorder = recorder.clone();
            let respond = respond.clone();
            async move {
                recorder.lock().unwrap().push(body.clone());
                let (status, value) = respond(&body);
                (status, Json(value))
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (format!("http://{addr}"), seen)
}

fn answer(content: &str) -> (StatusCode, Value) {
    (
        StatusCode::OK,
        json!({ "choices": [{ "message": { "content": content } }] }),
    )
}

fn content_of(body: &Value) -> String {
    body["messages"][0]["content"].as_str().unwrap().to_string()
}

/// "Translates" by prefixing every segment with 译, keeping tags, code spans
/// and placeholders exactly as a well-behaved engine would.
fn faithful(body: &Value) -> (StatusCode, Value) {
    let text = content_of(body);
    let tag = regex::Regex::new(r"<p(\d+)>").unwrap();
    if tag.is_match(&text) {
        answer(&tag.replace_all(&text, "<p$1>译"))
    } else {
        answer(&format!("译{text}"))
    }
}

fn settings(base_url: &str) -> TranslationSettings {
    TranslationSettings {
        dashscope_base_url: base_url.to_string(),
        tokenhub_base_url: base_url.to_string(),
        ..TranslationSettings::default()
    }
}

fn keys() -> ApiKeys {
    ApiKeys {
        dashscope: "sk-dashscope".into(),
        tokenhub: String::new(),
    }
}

fn request(texts: &[&str]) -> TranslateRequest {
    TranslateRequest {
        texts: texts.iter().map(|t| t.to_string()).collect(),
        target: "zh-CN".into(),
        source: None,
        groups: None,
    }
}

#[tokio::test]
async fn a_batch_goes_out_as_one_request_and_comes_back_from_the_cache() {
    let db = fresh_in_memory_db().await;
    let (base, seen) = mock_engine(Arc::new(faithful)).await;
    let settings = settings(&base);

    let result = translate_texts(
        &db.conn,
        &settings,
        &keys(),
        request(&["Call `useEditor`.", "Run ⟦C0⟧ again."]),
    )
    .await
    .expect("translate");
    assert_eq!(
        result.translations,
        vec![
            Some("译Call `useEditor`.".to_string()),
            Some("译Run ⟦C0⟧ again.".to_string())
        ]
    );
    assert_eq!(result.model.as_deref(), Some("qwen-mt-flash"));
    {
        let seen = seen.lock().unwrap();
        assert_eq!(seen.len(), 1, "both segments in one request");
        assert_eq!(
            content_of(&seen[0]),
            "<p0>Call `useEditor`.</p0>\n<p1>Run ⟦C0⟧ again.</p1>"
        );
        assert_eq!(seen[0]["translation_options"]["target_lang"], "Chinese");
    }

    let again = translate_texts(
        &db.conn,
        &settings,
        &keys(),
        request(&["Run ⟦C0⟧ again.", "   "]),
    )
    .await
    .expect("translate again");
    assert_eq!(
        again.translations,
        vec![
            Some("译Run ⟦C0⟧ again.".to_string()),
            Some("   ".to_string())
        ]
    );
    assert_eq!(again.model, None, "nothing was sent");
    assert_eq!(seen.lock().unwrap().len(), 1);
}

#[tokio::test]
async fn the_paragraphs_of_a_reply_share_a_call() {
    let db = fresh_in_memory_db().await;
    let (base, seen) = mock_engine(Arc::new(faithful)).await;
    let settings = settings(&base);
    let a = "a".repeat(2000);
    let b = "b".repeat(3500);
    let c = "c".repeat(2000);

    // Two replies: the second (b + c) fits one call but not next to the first.
    let replies = TranslateRequest {
        groups: Some(vec![0, 1, 1]),
        ..request(&[&a, &b, &c])
    };
    translate_texts(&db.conn, &settings, &keys(), replies)
        .await
        .expect("translate");
    // The two calls run in parallel, so they may arrive in either order.
    let calls: Vec<String> = seen.lock().unwrap().iter().map(content_of).collect();
    assert_eq!(calls.len(), 2);
    assert!(calls.contains(&a));
    assert!(calls.contains(&format!("<p0>{b}</p0>\n<p1>{c}</p1>")));
}

#[tokio::test]
async fn a_damaged_segment_is_retried_on_its_own() {
    let db = fresh_in_memory_db().await;
    let (base, seen) = mock_engine(Arc::new(|body: &Value| {
        let text = content_of(body);
        if text.contains("<p0>") {
            // The packed answer loses the code span in the second segment.
            answer("<p0>译一</p0>\n<p1>译二，没有代码</p1>")
        } else {
            answer(&format!("译{text}"))
        }
    }))
    .await;

    let result = translate_texts(
        &db.conn,
        &settings(&base),
        &keys(),
        request(&["One.", "Two `code`."]),
    )
    .await
    .expect("translate");
    assert_eq!(
        result.translations,
        vec![Some("译一".to_string()), Some("译Two `code`.".to_string())]
    );
    let seen = seen.lock().unwrap();
    assert_eq!(seen.len(), 2);
    assert_eq!(content_of(&seen[1]), "Two `code`.");
}

#[tokio::test]
async fn a_segment_still_damaged_after_the_retry_comes_back_empty() {
    let db = fresh_in_memory_db().await;
    let (base, _seen) = mock_engine(Arc::new(|_: &Value| answer("没有占位符"))).await;
    let result = translate_texts(&db.conn, &settings(&base), &keys(), request(&["Run ⟦C0⟧."]))
        .await
        .expect("translate");
    assert_eq!(result.translations, vec![None]);
}

#[tokio::test]
async fn a_rate_limited_model_falls_back_to_qwen_mt_lite() {
    let db = fresh_in_memory_db().await;
    let (base, seen) = mock_engine(Arc::new(|body: &Value| {
        if body["model"] == "qwen-mt-flash" {
            (
                StatusCode::TOO_MANY_REQUESTS,
                json!({ "error": { "message": "Requests rate limit exceeded" } }),
            )
        } else {
            faithful(body)
        }
    }))
    .await;

    let result = translate_texts(&db.conn, &settings(&base), &keys(), request(&["Hi."]))
        .await
        .expect("translate");
    assert_eq!(result.translations, vec![Some("译Hi.".to_string())]);
    assert_eq!(result.model.as_deref(), Some("qwen-mt-lite"));
    let models: Vec<Value> = seen
        .lock()
        .unwrap()
        .iter()
        .map(|b| b["model"].clone())
        .collect();
    assert_eq!(models, vec![json!("qwen-mt-flash"), json!("qwen-mt-lite")]);
}

#[tokio::test]
async fn a_rejected_key_is_reported_instead_of_falling_back() {
    let db = fresh_in_memory_db().await;
    let (base, seen) = mock_engine(Arc::new(|_: &Value| {
        (
            StatusCode::UNAUTHORIZED,
            json!({ "error": { "message": "Incorrect API key" } }),
        )
    }))
    .await;

    let err = translate_texts(&db.conn, &settings(&base), &keys(), request(&["Hi."]))
        .await
        .expect_err("a bad key must surface");
    assert!(matches!(err, TranslateError::Auth { status: 401, .. }));
    assert_eq!(seen.lock().unwrap().len(), 1);
}

#[tokio::test]
async fn an_unsupported_language_is_refused_before_any_request() {
    let db = fresh_in_memory_db().await;
    let mut req = request(&["Hi."]);
    req.target = "xx".into();
    let err = translate_texts(&db.conn, &settings("http://127.0.0.1:9"), &keys(), req)
        .await
        .expect_err("unsupported");
    assert!(matches!(err, TranslateError::UnsupportedLanguage(code) if code == "xx"));
}

#[test]
fn the_chain_starts_with_the_chosen_engine_and_needs_its_key() {
    let settings = TranslationSettings::default();
    let err = engine_chain(&settings, &ApiKeys::default()).expect_err("no key");
    assert!(matches!(
        err,
        TranslateError::MissingKey {
            provider: "dashscope"
        }
    ));

    let both = ApiKeys {
        dashscope: "a".into(),
        tokenhub: "b".into(),
    };
    let models: Vec<String> = engine_chain(&settings, &both)
        .unwrap()
        .into_iter()
        .map(|e| e.model)
        .collect();
    assert_eq!(models, vec!["qwen-mt-flash", "qwen-mt-lite", "hy-mt2-plus"]);

    let no_fallback = TranslationSettings {
        fallback_enabled: false,
        ..TranslationSettings::default()
    };
    assert_eq!(engine_chain(&no_fallback, &both).unwrap().len(), 1);

    let tokenhub_first = TranslationSettings {
        provider: TranslationProvider::Tokenhub,
        ..TranslationSettings::default()
    };
    let chain = engine_chain(&tokenhub_first, &both).unwrap();
    assert_eq!(chain[0].model, "hy-mt2-plus");
    assert_eq!(chain[0].api_key, "b");
    assert_eq!(chain[1].model, "qwen-mt-flash");
    // A fallback is skipped, not attempted, when it has no key.
    let only_tokenhub = ApiKeys {
        dashscope: String::new(),
        tokenhub: "b".into(),
    };
    assert_eq!(
        engine_chain(&tokenhub_first, &only_tokenhub).unwrap().len(),
        1
    );
}

#[test]
fn the_cache_key_depends_on_languages_glossary_and_text() {
    let zh = languages::find("zh-CN").unwrap();
    let en = languages::find("en").unwrap();
    let base = cache_key(None, zh, "", "Hi");
    assert_ne!(base, cache_key(Some(en), zh, "", "Hi"));
    assert_ne!(base, cache_key(None, en, "", "Hi"));
    assert_ne!(base, cache_key(None, zh, "g", "Hi"));
    assert_ne!(base, cache_key(None, zh, "", "Hi!"));
    assert_eq!(base, cache_key(None, zh, "", "Hi"));
}

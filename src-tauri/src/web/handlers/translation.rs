use std::sync::Arc;

use axum::{extract::Extension, Json};
use serde::Deserialize;

use crate::app_error::AppCommandError;
use crate::app_state::AppState;
use crate::commands::translation as translation_commands;
use crate::models::translation::{
    TranslateRequest, TranslateResult, TranslationProvider, TranslationSettingsInput,
    TranslationSettingsView, TranslationTestResult,
};

pub async fn get_translation_settings(
    Extension(state): Extension<Arc<AppState>>,
) -> Result<Json<TranslationSettingsView>, AppCommandError> {
    Ok(Json(
        translation_commands::get_translation_settings_core(&state.db).await?,
    ))
}

#[derive(Deserialize)]
pub struct SaveTranslationSettingsParams {
    pub settings: TranslationSettingsInput,
}

pub async fn save_translation_settings(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<SaveTranslationSettingsParams>,
) -> Result<Json<TranslationSettingsView>, AppCommandError> {
    Ok(Json(
        translation_commands::save_translation_settings_core(
            &state.emitter,
            &state.db,
            params.settings,
        )
        .await?,
    ))
}

#[derive(Deserialize)]
pub struct TranslateTextsParams {
    pub request: TranslateRequest,
}

pub async fn translate_texts(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<TranslateTextsParams>,
) -> Result<Json<TranslateResult>, AppCommandError> {
    Ok(Json(
        translation_commands::translate_texts_core(&state.db, params.request).await?,
    ))
}

#[derive(Deserialize)]
pub struct TestTranslationProviderParams {
    pub provider: TranslationProvider,
}

pub async fn test_translation_provider(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<TestTranslationProviderParams>,
) -> Result<Json<TranslationTestResult>, AppCommandError> {
    Ok(Json(
        translation_commands::test_translation_provider_core(&state.db, params.provider).await?,
    ))
}

pub async fn clear_translation_cache(
    Extension(state): Extension<Arc<AppState>>,
) -> Result<Json<u64>, AppCommandError> {
    Ok(Json(
        translation_commands::clear_translation_cache_core(&state.db).await?,
    ))
}

#[derive(Deserialize)]
pub struct SaveSentOriginalParams {
    pub sent: Vec<String>,
    pub original: String,
}

pub async fn save_sent_original(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<SaveSentOriginalParams>,
) -> Result<Json<()>, AppCommandError> {
    translation_commands::save_sent_original_core(&state.db, params.sent, params.original)
        .await?;
    Ok(Json(()))
}

#[derive(Deserialize)]
pub struct GetSentOriginalsParams {
    pub texts: Vec<String>,
}

pub async fn get_sent_originals(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<GetSentOriginalsParams>,
) -> Result<Json<Vec<Option<String>>>, AppCommandError> {
    Ok(Json(
        translation_commands::get_sent_originals_core(&state.db, params.texts).await?,
    ))
}

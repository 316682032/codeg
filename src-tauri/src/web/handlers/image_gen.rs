use std::sync::Arc;

use axum::{extract::Extension, Json};
use serde::Deserialize;

use crate::app_error::AppCommandError;
use crate::app_state::AppState;
use crate::commands::image_gen::{
    self as image_gen_commands, ImageGenSettingsInput, ImageGenSettingsView, ImageGenTestResult,
};
use crate::image_gen::files::EncodedImage;
use crate::image_gen::jobs::JobView;

pub async fn get_image_gen_settings(
    Extension(state): Extension<Arc<AppState>>,
) -> Result<Json<ImageGenSettingsView>, AppCommandError> {
    Ok(Json(
        image_gen_commands::get_image_gen_settings_core(&state.db).await?,
    ))
}

#[derive(Deserialize)]
pub struct SaveImageGenSettingsParams {
    pub settings: ImageGenSettingsInput,
}

pub async fn save_image_gen_settings(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<SaveImageGenSettingsParams>,
) -> Result<Json<ImageGenSettingsView>, AppCommandError> {
    Ok(Json(
        image_gen_commands::save_image_gen_settings_core(
            &state.emitter,
            &state.db,
            params.settings,
        )
        .await?,
    ))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestImageGenServiceParams {
    pub service_id: String,
    pub model: String,
}

pub async fn test_image_gen_service(
    Extension(state): Extension<Arc<AppState>>,
    Json(params): Json<TestImageGenServiceParams>,
) -> Result<Json<ImageGenTestResult>, AppCommandError> {
    Ok(Json(
        image_gen_commands::test_image_gen_service_core(&state.db, params.service_id, params.model)
            .await?,
    ))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageGenJobStatusParams {
    pub job_id: String,
}

pub async fn image_gen_job_status(
    Json(params): Json<ImageGenJobStatusParams>,
) -> Result<Json<JobView>, AppCommandError> {
    Ok(Json(
        image_gen_commands::image_gen_job_status_core(params.job_id).await?,
    ))
}

#[derive(Deserialize)]
pub struct ImageGenLoadImageParams {
    pub path: String,
}

pub async fn image_gen_load_image(
    Json(params): Json<ImageGenLoadImageParams>,
) -> Result<Json<EncodedImage>, AppCommandError> {
    Ok(Json(
        image_gen_commands::image_gen_load_image_core(params.path).await?,
    ))
}

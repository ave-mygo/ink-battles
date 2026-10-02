use axum::{Json, http::StatusCode};
use serde::Serialize;

use crate::models::ApiResponse;

pub fn ok<T: Serialize>(message: &str, data: T) -> Json<ApiResponse<T>> {
    Json(ApiResponse {
        success: true,
        message: message.to_string(),
        data: Some(data),
    })
}

pub fn bad_request(message: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::BAD_REQUEST,
        Json(ApiResponse {
            success: false,
            message: message.to_string(),
            data: None,
        }),
    )
}

pub fn unauthorized(message: &str) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    (
        StatusCode::UNAUTHORIZED,
        Json(ApiResponse {
            success: false,
            message: message.to_string(),
            data: None,
        }),
    )
}

pub fn internal_error(
    error: impl std::fmt::Display,
) -> (StatusCode, Json<ApiResponse<serde_json::Value>>) {
    tracing::error!("auth service internal error: {}", error);
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse {
            success: false,
            message: "服务暂时不可用".to_string(),
            data: None,
        }),
    )
}

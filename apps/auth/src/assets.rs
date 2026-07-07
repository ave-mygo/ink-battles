use axum::{
    extract::State,
    http::{HeaderValue, StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use rust_embed::RustEmbed;

use crate::{config::AppConfig, state::AppState};

#[derive(RustEmbed)]
#[folder = "panel/out/"]
struct AuthAssets;

pub async fn static_handler(State(state): State<AppState>, uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let candidate = if path.is_empty() {
        "index.html".to_string()
    } else if path.contains('.') {
        path.to_string()
    } else {
        format!("{}/index.html", path.trim_end_matches('/'))
    };
    serve_asset(&candidate, &state.config).unwrap_or_else(|| {
        serve_asset("404.html", &state.config)
            .unwrap_or_else(|| (StatusCode::NOT_FOUND, "Not Found").into_response())
    })
}

fn serve_asset(path: &str, config: &AppConfig) -> Option<Response> {
    let asset = AuthAssets::get(path)?;
    let body = if should_inject_runtime_config(path) {
        inject_runtime_config(asset.data.as_ref(), config)
    } else {
        asset.data.into_owned()
    };
    let mut response = body.into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(content_type(path)),
    );
    Some(response)
}

fn should_inject_runtime_config(path: &str) -> bool {
    path.ends_with(".html")
}

fn inject_runtime_config(bytes: &[u8], config: &AppConfig) -> Vec<u8> {
    let Ok(content) = std::str::from_utf8(bytes) else {
        return bytes.to_vec();
    };

    let script = runtime_config_script(config);
    content
        .replacen("</head>", &format!("{script}</head>"), 1)
        .into_bytes()
}

fn runtime_config_script(config: &AppConfig) -> String {
    let runtime_config = serde_json::json!({
        "fcaptcha": {
            "serverUrl": config.fcaptcha_server_url,
            "siteKey": config.fcaptcha_site_key,
        },
    });

    format!("<script>window.__AUTH_PANEL_CONFIG__={runtime_config};</script>")
}

fn content_type(path: &str) -> &'static str {
    if path.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if path.ends_with(".js") {
        "application/javascript; charset=utf-8"
    } else if path.ends_with(".json") {
        "application/json; charset=utf-8"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".png") {
        "image/png"
    } else {
        "application/octet-stream"
    }
}

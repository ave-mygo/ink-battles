use axum::{
    http::{HeaderValue, StatusCode, Uri, header},
    response::{IntoResponse, Response},
};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "panel/out/"]
struct AuthAssets;

pub async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches('/');
    let candidate = if path.is_empty() {
        "index.html".to_string()
    } else if path.contains('.') {
        path.to_string()
    } else {
        format!("{}/index.html", path.trim_end_matches('/'))
    };
    serve_asset(&candidate).unwrap_or_else(|| {
        serve_asset("404.html")
            .unwrap_or_else(|| (StatusCode::NOT_FOUND, "Not Found").into_response())
    })
}

fn serve_asset(path: &str) -> Option<Response> {
    let asset = AuthAssets::get(path)?;
    let mut response = asset.data.into_owned().into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(content_type(path)),
    );
    Some(response)
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

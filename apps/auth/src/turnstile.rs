use axum::http::HeaderMap;
use serde::Deserialize;

use crate::state::AppState;

const TURNSTILE_SITEVERIFY_URL: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

#[derive(Deserialize)]
struct TurnstileSiteverifyResponse {
    success: bool,
    hostname: Option<String>,
    action: Option<String>,
    #[serde(rename = "error-codes")]
    error_codes: Option<Vec<String>>,
}

/**
 * Verifies a Cloudflare Turnstile token with server-side siteverify.
 *
 * Turnstile tokens are already single-use on Cloudflare's side, so this verifier
 * only needs to call siteverify and validate the returned action.
 */
pub async fn verify_turnstile(
    state: &AppState,
    headers: &HeaderMap,
    token: Option<&str>,
    action: &str,
) -> std::result::Result<(), String> {
    let config = &state.config;
    if !config.turnstile_enabled {
        return Ok(());
    }

    let token = token
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "人机验证失败，请刷新页面后重试".to_string())?;
    let secret = config
        .turnstile_secret
        .as_deref()
        .ok_or_else(|| "人机验证密钥未配置".to_string())?;

    let mut form = vec![
        ("secret".to_string(), secret.to_string()),
        ("response".to_string(), token.to_string()),
    ];
    if let Some(client_ip) = real_client_ip(headers) {
        form.push(("remoteip".to_string(), client_ip));
    }

    let response = reqwest::Client::new()
        .post(TURNSTILE_SITEVERIFY_URL)
        .form(&form)
        .send()
        .await
        .map_err(|error| {
            tracing::warn!(%action, error = %error, "turnstile siteverify request failed");
            "人机验证服务暂时不可用，请稍后重试".to_string()
        })?;

    let verification = response
        .json::<TurnstileSiteverifyResponse>()
        .await
        .map_err(|error| {
            tracing::warn!(%action, error = %error, "turnstile siteverify response was invalid");
            "人机验证服务暂时不可用，请稍后重试".to_string()
        })?;

    if !verification.success {
        tracing::warn!(
            %action,
            error_codes = ?verification.error_codes,
            "turnstile rejected token"
        );
        return Err("人机验证失败，请刷新页面后重试".to_string());
    }

    if verification.action.as_deref() != Some(action) {
        tracing::warn!(
            %action,
            returned_action = ?verification.action,
            "turnstile action mismatch"
        );
        return Err("人机验证失败，请刷新页面后重试".to_string());
    }

    tracing::info!(
        %action,
        hostname = ?verification.hostname,
        "turnstile token accepted"
    );
    Ok(())
}

fn real_client_ip(headers: &HeaderMap) -> Option<String> {
    for name in [
        "cf-connecting-ip",
        "true-client-ip",
        "x-real-ip",
        "x-client-ip",
        "x-forwarded-for",
    ] {
        let Some(value) = headers.get(name).and_then(|value| value.to_str().ok()) else {
            continue;
        };
        let candidate = value.split(',').next().unwrap_or_default().trim();
        if !candidate.is_empty() {
            return Some(candidate.to_string());
        }
    }
    None
}

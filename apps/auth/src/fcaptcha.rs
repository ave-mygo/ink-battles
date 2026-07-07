use std::collections::BTreeMap;

use axum::http::HeaderMap;
use base64::{
    Engine as _,
    engine::general_purpose::{STANDARD, URL_SAFE, URL_SAFE_NO_PAD},
};
use chrono::Utc;
use hmac::{Hmac, Mac};
use mongodb::bson::{DateTime as BsonDateTime, doc};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::state::AppState;

type HmacSha256 = Hmac<Sha256>;
const FCAPTCHA_TOKEN_TTL_SECONDS: i64 = 300;

struct VerifiedToken {
    sig: String,
    site_key: String,
    score: f64,
    timestamp: i64,
    ip_hash: Option<String>,
}

pub async fn verify_fcaptcha(
    state: &AppState,
    headers: &HeaderMap,
    token: Option<&str>,
    action: &str,
) -> std::result::Result<(), String> {
    let config = &state.config;
    if !config.fcaptcha_enabled {
        return Ok(());
    }

    let token = token
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "人机验证失败，请刷新页面后重试".to_string())?;
    let secret = config
        .fcaptcha_secret
        .as_deref()
        .ok_or_else(|| "人机验证密钥未配置".to_string())?;

    let verified = verify_token_signature(token, secret).map_err(|reason| {
        tracing::warn!(%action, %reason, "fcaptcha rejected token");
        "人机验证失败，请刷新页面后重试".to_string()
    })?;

    if verified.site_key != config.fcaptcha_site_key.as_deref().unwrap_or_default() {
        tracing::warn!(%action, "fcaptcha site key mismatch");
        return Err("人机验证失败，请刷新页面后重试".to_string());
    }

    if verified.score >= config.fcaptcha_max_score {
        tracing::warn!(%action, score = verified.score, "fcaptcha score exceeded threshold");
        return Err("当前请求风险较高，请稍后重试".to_string());
    }

    if let Some(client_ip) = real_client_ip(headers) {
        let expected_ip_hash = ip_hash(&client_ip);
        if verified.ip_hash.as_deref() != Some(expected_ip_hash.as_str()) {
            tracing::warn!(%action, "fcaptcha ip hash mismatch");
            if config.fcaptcha_verify_ip_hash {
                return Err("人机验证失败，请刷新页面后重试".to_string());
            }
        }
    } else {
        tracing::debug!(%action, "fcaptcha ip hash check skipped because no client ip header was present");
    }

    consume_token_once(state, &verified, action).await?;
    tracing::info!(%action, score = verified.score, "fcaptcha token accepted");
    Ok(())
}

fn verify_token_signature(token: &str, secret: &str) -> std::result::Result<VerifiedToken, String> {
    let decoded = decode_token_payload(token).map_err(|_| "invalid_base64".to_string())?;
    let mut value =
        serde_json::from_slice::<Value>(&decoded).map_err(|_| "invalid_json".to_string())?;
    let object = value
        .as_object_mut()
        .ok_or_else(|| "invalid_payload".to_string())?;
    let sig = object
        .remove("sig")
        .and_then(|value| value.as_str().map(ToOwned::to_owned))
        .ok_or_else(|| "missing_signature".to_string())?;

    let sorted_payload = object
        .iter()
        .map(|(key, value)| (key.clone(), value.clone()))
        .collect::<BTreeMap<_, _>>();
    let payload =
        serde_json::to_string(&sorted_payload).map_err(|_| "invalid_payload".to_string())?;
    let expected_sig = hex::decode(&sig).map_err(|_| "invalid_signature".to_string())?;
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| "invalid_secret".to_string())?;
    mac.update(payload.as_bytes());
    mac.verify_slice(&expected_sig)
        .map_err(|_| "invalid_signature".to_string())?;

    let site_key = object
        .get("site_key")
        .and_then(Value::as_str)
        .ok_or_else(|| "missing_site_key".to_string())?
        .to_string();
    let timestamp = object
        .get("timestamp")
        .and_then(Value::as_i64)
        .ok_or_else(|| "missing_timestamp".to_string())?;
    let score = object
        .get("score")
        .and_then(Value::as_f64)
        .ok_or_else(|| "missing_score".to_string())?;
    let ip_hash = object
        .get("ip_hash")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned);

    let now = Utc::now().timestamp();
    if now - timestamp > FCAPTCHA_TOKEN_TTL_SECONDS || timestamp > now + 60 {
        return Err("expired".to_string());
    }

    Ok(VerifiedToken {
        sig,
        site_key,
        score,
        timestamp,
        ip_hash,
    })
}

fn decode_token_payload(token: &str) -> std::result::Result<Vec<u8>, base64::DecodeError> {
    URL_SAFE_NO_PAD
        .decode(token)
        .or_else(|_| URL_SAFE.decode(token))
        .or_else(|_| STANDARD.decode(token))
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

fn ip_hash(ip: &str) -> String {
    let digest = Sha256::digest(ip.as_bytes());
    hex::encode(digest)[..8].to_string()
}

async fn consume_token_once(
    state: &AppState,
    token: &VerifiedToken,
    action: &str,
) -> std::result::Result<(), String> {
    let now = Utc::now();
    let expires_at =
        BsonDateTime::from_millis((token.timestamp + FCAPTCHA_TOKEN_TTL_SECONDS) * 1000);
    let insert_result = state
        .fcaptcha_tokens
        .insert_one(doc! {
            "sig": &token.sig,
            "action": action,
            "siteKey": &token.site_key,
            "score": token.score,
            "createdAt": BsonDateTime::from_millis(now.timestamp_millis()),
            "expiresAt": expires_at,
        })
        .await;

    match insert_result {
        Ok(_) => Ok(()),
        Err(error) if is_duplicate_key_error(&error) => {
            tracing::warn!(%action, "fcaptcha token already used");
            Err("人机验证已失效，请刷新页面后重试".to_string())
        }
        Err(error) => {
            tracing::warn!(%action, error = %error, "failed to consume fcaptcha token");
            Err("人机验证服务暂时不可用，请稍后重试".to_string())
        }
    }
}

fn is_duplicate_key_error(error: &mongodb::error::Error) -> bool {
    error
        .get_custom::<mongodb::error::WriteFailure>()
        .and_then(|failure| match failure {
            mongodb::error::WriteFailure::WriteError(write_error) => Some(write_error.code),
            _ => None,
        })
        == Some(11000)
}

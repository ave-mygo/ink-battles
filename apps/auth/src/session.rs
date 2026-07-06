use anyhow::Result;
use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, header},
    response::{IntoResponse, Response},
};
use chrono::{DateTime, TimeDelta, Utc};
use cookie::{Cookie, SameSite};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use mongodb::bson::{DateTime as BsonDateTime, doc};
use uuid::Uuid;

use crate::{
    SESSION_TTL_SECONDS,
    config::AppConfig,
    models::{
        ApiResponse, AuthorizePayload, Claims, IntrospectionResponse, LoginResponse, SessionInfo,
    },
    response::{internal_error, ok, unauthorized},
    state::AppState,
    utils::{bson_datetime_to_rfc3339, sanitize_return_url},
};

pub async fn list_sessions(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let (claims, _) = match current_session(&state, &headers).await {
        Ok(Some(value)) => value,
        _ => return unauthorized("未登录").into_response(),
    };
    let mut cursor = match state
        .auth_sessions
        .find(doc! { "uid": claims.uid, "kind": { "$ne": "site" }, "revokedAt": { "$exists": false }, "expiresAt": { "$gt": BsonDateTime::now() } })
        .await
    {
        Ok(cursor) => cursor,
        Err(error) => return internal_error(error).into_response(),
    };
    let mut sessions = Vec::new();
    while cursor.advance().await.unwrap_or(false) {
        if let Ok(session) = cursor.deserialize_current() {
            let session_id = session.get_str("sessionId").unwrap_or_default().to_string();
            sessions.push(SessionInfo {
                current: session_id == claims.session_id,
                session_id,
                created_at: bson_datetime_to_rfc3339(session.get_datetime("createdAt").ok()),
                expires_at: bson_datetime_to_rfc3339(session.get_datetime("expiresAt").ok()),
                user_agent: session.get_str("userAgent").ok().map(ToOwned::to_owned),
            });
        }
    }
    ok("会话列表", sessions).into_response()
}

pub async fn revoke_session(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let (claims, _) = match current_session(&state, &headers).await {
        Ok(Some(value)) => value,
        _ => return unauthorized("未登录").into_response(),
    };
    match state
        .auth_sessions
        .update_one(
                doc! { "uid": claims.uid, "sessionId": session_id, "kind": { "$ne": "site" }, "revokedAt": { "$exists": false } },
            doc! { "$set": { "revokedAt": BsonDateTime::now() } },
        )
        .await
    {
        Ok(_) => ok::<serde_json::Value>("会话已撤销", serde_json::json!({})).into_response(),
        Err(error) => internal_error(error).into_response(),
    }
}

pub async fn issue_login_response(
    state: &AppState,
    headers: &HeaderMap,
    uid: i64,
    return_to: Option<String>,
) -> Response {
    issue_login_response_with_method(state, headers, uid, return_to, None).await
}

pub async fn issue_login_response_with_method(
    state: &AppState,
    headers: &HeaderMap,
    uid: i64,
    return_to: Option<String>,
    login_method: Option<&str>,
) -> Response {
    let token = match issue_auth_cookie_with_method(state, headers, uid, login_method).await {
        Ok(token) => token,
        Err(error) => return internal_error(error).into_response(),
    };
    let return_to = sanitize_return_url(&state.config, return_to);
    let mut response = Json(ApiResponse {
        success: true,
        message: "登录成功".to_string(),
        data: Some(LoginResponse { return_to }),
    })
    .into_response();
    append_cookie(
        &state.config,
        &mut response,
        named_auth_cookie(&state.config, &state.config.cookie_name, &token),
    );
    response
}

pub async fn authorize_site(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<AuthorizePayload>,
) -> impl IntoResponse {
    let (claims, _) = match current_session(&state, &headers).await {
        Ok(Some(value)) => value,
        _ => return unauthorized("请先登录认证中心").into_response(),
    };
    let token = match issue_session_token(&state, &headers, claims.uid, "site", None).await {
        Ok(token) => token,
        Err(error) => return internal_error(error).into_response(),
    };
    let return_to = sanitize_return_url(&state.config, payload.return_to);
    let mut response = Json(ApiResponse {
        success: true,
        message: "授权成功".to_string(),
        data: Some(LoginResponse { return_to }),
    })
    .into_response();
    append_cookie(
        &state.config,
        &mut response,
        named_auth_cookie(&state.config, &state.config.site_cookie_name, &token),
    );
    response
}

pub async fn introspect_site_session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    match current_site_session(&state, &headers).await {
        Ok(Some((claims, _))) => ok(
            "会话有效",
            IntrospectionResponse {
                active: true,
                uid: Some(claims.uid),
                session_id: Some(claims.session_id),
            },
        )
        .into_response(),
        _ => ok(
            "会话无效",
            IntrospectionResponse {
                active: false,
                uid: None,
                session_id: None,
            },
        )
        .into_response(),
    }
}

pub async fn current_session(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Option<(Claims, String)>> {
    let Some(token) = read_named_token(headers, &state.config.cookie_name) else {
        return Ok(None);
    };
    let claims = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .ok()
    .map(|data| data.claims);
    let Some(claims) = claims else {
        return Ok(None);
    };
    let session = state
        .auth_sessions
        .find_one(doc! {
            "uid": claims.uid,
            "sessionId": &claims.session_id,
            "kind": { "$ne": "site" },
            "revokedAt": { "$exists": false },
            "expiresAt": { "$gt": BsonDateTime::now() },
        })
        .await?;
    Ok(session.map(|_| (claims, token)))
}

async fn current_site_session(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Option<(Claims, String)>> {
    let Some(token) = read_named_token(headers, &state.config.site_cookie_name) else {
        return Ok(None);
    };
    let claims = decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .ok()
    .map(|data| data.claims);
    let Some(claims) = claims else {
        return Ok(None);
    };
    let session = state
        .auth_sessions
        .find_one(doc! {
            "uid": claims.uid,
            "sessionId": &claims.session_id,
            "kind": "site",
            "revokedAt": { "$exists": false },
            "expiresAt": { "$gt": BsonDateTime::now() },
        })
        .await?;
    Ok(session.map(|_| (claims, token)))
}

pub fn append_cookie(config: &AppConfig, response: &mut Response, cookie: Cookie<'static>) {
    if let Ok(value) = HeaderValue::from_str(&cookie.to_string()) {
        response.headers_mut().append(header::SET_COOKIE, value);
    } else {
        tracing::error!("无法写入 {} Cookie", config.cookie_name);
    }
}

pub fn clear_auth_cookie(config: &AppConfig) -> Cookie<'static> {
    let mut builder = Cookie::build((config.cookie_name.clone(), ""))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(cookie::time::Duration::seconds(0));
    if let Some(domain) = &config.cookie_domain {
        builder = builder.domain(domain.clone());
    }
    if config.cookie_secure {
        builder = builder.secure(true);
    }
    builder.build()
}

fn sign_token(
    config: &AppConfig,
    uid: i64,
    session_id: &str,
    expires_at: DateTime<Utc>,
) -> Result<String> {
    Ok(encode(
        &Header::default(),
        &Claims {
            uid,
            session_id: session_id.to_string(),
            exp: expires_at.timestamp() as usize,
        },
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )?)
}

pub async fn issue_auth_cookie_with_method(
    state: &AppState,
    headers: &HeaderMap,
    uid: i64,
    login_method: Option<&str>,
) -> Result<String> {
    issue_session_token(state, headers, uid, "auth", login_method).await
}

async fn issue_session_token(
    state: &AppState,
    headers: &HeaderMap,
    uid: i64,
    kind: &str,
    login_method: Option<&str>,
) -> Result<String> {
    let session_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let expires_at = now + TimeDelta::seconds(SESSION_TTL_SECONDS);
    let user_agent = headers
        .get(header::USER_AGENT)
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned);
    let mut session = doc! {
        "sessionId": &session_id,
        "uid": uid,
        "kind": kind,
        "createdAt": BsonDateTime::from_millis(now.timestamp_millis()),
        "expiresAt": BsonDateTime::from_millis(expires_at.timestamp_millis()),
        "userAgent": user_agent,
    };
    if let Some(login_method) = login_method {
        session.insert("loginMethod", login_method);
    }
    state.auth_sessions.insert_one(session).await?;
    sign_token(&state.config, uid, &session_id, expires_at)
}

fn read_named_token(headers: &HeaderMap, cookie_name: &str) -> Option<String> {
    if let Some(value) = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
    {
        if let Some(token) = value.strip_prefix("Bearer ") {
            return Some(token.to_string());
        }
    }
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .filter_map(|item| Cookie::parse(item.trim()).ok())
        .find(|cookie| cookie.name() == cookie_name)
        .map(|cookie| cookie.value().to_string())
}

pub fn named_auth_cookie(config: &AppConfig, name: &str, token: &str) -> Cookie<'static> {
    let mut builder = Cookie::build((name.to_string(), token.to_string()))
        .path("/")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(cookie::time::Duration::seconds(SESSION_TTL_SECONDS));
    if let Some(domain) = &config.cookie_domain {
        builder = builder.domain(domain.clone());
    }
    if config.cookie_secure {
        builder = builder.secure(true);
    }
    builder.build()
}

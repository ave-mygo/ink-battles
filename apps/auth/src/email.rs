use anyhow::Result;
use axum::{
    Json,
    extract::{Query, State},
    http::HeaderMap,
    response::{IntoResponse, Redirect},
};
use bcrypt::{DEFAULT_COST, hash, verify};
use chrono::{TimeDelta, Utc};
use mongodb::{
    bson::{DateTime as BsonDateTime, doc, oid::ObjectId},
    options::ReturnDocument,
};
use rand::RngExt;
use uuid::Uuid;

use crate::{
    EMAIL_CODE_TTL_MINUTES, RESET_SESSION_TTL_MINUTES,
    fcaptcha::verify_fcaptcha,
    mail::send_verification_email,
    models::{
        EmailPayload, ResetPasswordPayload, SendCodePayload, VerifyCodePayload, VerifyEmailQuery,
    },
    response::{bad_request, internal_error, ok},
    state::AppState,
    utils::{
        is_valid_email, normalize_code_type, normalize_email, read_uid, sanitize_return_url,
        url_encode,
    },
};

pub async fn send_verification_code(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SendCodePayload>,
) -> impl IntoResponse {
    if let Err(message) = verify_fcaptcha(
        &state,
        &headers,
        payload.fcaptcha_token.as_deref(),
        "send_verification_code",
    )
    .await
    {
        return bad_request(&message).into_response();
    }

    let email = normalize_email(&payload.email);
    let code_type = normalize_code_type(payload.code_type.as_deref());
    match create_email_code(&state, &email, code_type).await {
        Ok(_) => ok::<serde_json::Value>("验证码已发送", serde_json::json!({})).into_response(),
        Err(error) => bad_request(&error.to_string()).into_response(),
    }
}

pub async fn verify_email_link(
    State(state): State<AppState>,
    Query(query): Query<VerifyEmailQuery>,
) -> impl IntoResponse {
    let email = normalize_email(&query.email);
    let code_type = normalize_code_type(query.code_type.as_deref());
    let status = if consume_email_code(&state, &email, &query.code, code_type)
        .await
        .is_ok()
    {
        "success"
    } else {
        "failed"
    };
    let return_to = sanitize_return_url(&state.config, query.return_to);
    Redirect::temporary(&format!(
        "/verify-email/{}/?returnTo={}",
        status,
        url_encode(&return_to)
    ))
}

pub async fn forgot_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<EmailPayload>,
) -> impl IntoResponse {
    if let Err(message) = verify_fcaptcha(
        &state,
        &headers,
        payload.fcaptcha_token.as_deref(),
        "forgot_password",
    )
    .await
    {
        return bad_request(&message).into_response();
    }

    let email = normalize_email(&payload.email);
    if state
        .users
        .find_one(doc! { "email": &email })
        .await
        .ok()
        .flatten()
        .is_some()
    {
        let _ = create_email_code(&state, &email, "reset-password").await;
    }
    ok::<serde_json::Value>(
        "如果该邮箱已注册，您将收到重置密码验证码",
        serde_json::json!({}),
    )
    .into_response()
}

pub async fn verify_reset_code(
    State(state): State<AppState>,
    Json(payload): Json<VerifyCodePayload>,
) -> impl IntoResponse {
    let email = normalize_email(&payload.email);
    match consume_email_code(&state, &email, &payload.code, "reset-password").await {
        Ok(()) => match create_password_reset_session(&state, &email, &payload.code).await {
            Ok(()) => {
                ok::<serde_json::Value>("验证码校验通过", serde_json::json!({})).into_response()
            }
            Err(error) => internal_error(error).into_response(),
        },
        Err(message) => bad_request(&message).into_response(),
    }
}

pub async fn reset_password(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ResetPasswordPayload>,
) -> impl IntoResponse {
    if let Err(message) = verify_fcaptcha(
        &state,
        &headers,
        payload.fcaptcha_token.as_deref(),
        "reset_password",
    )
    .await
    {
        return bad_request(&message).into_response();
    }

    let email = normalize_email(&payload.email);
    if payload.password != payload.confirm_password {
        return bad_request("两次输入的密码不一致").into_response();
    }
    if let Err(message) = consume_password_reset_session(&state, &email, &payload.code).await {
        return bad_request(&message).into_response();
    }
    let password_hash = match hash(&payload.password, DEFAULT_COST) {
        Ok(value) => value,
        Err(error) => return internal_error(error).into_response(),
    };
    let user = match state
        .users
        .find_one_and_update(
            doc! { "email": &email },
            doc! { "$set": { "passwordHash": password_hash, "updatedAt": BsonDateTime::now() } },
        )
        .return_document(ReturnDocument::After)
        .await
    {
        Ok(Some(user)) => user,
        Ok(None) => return bad_request("账号不存在").into_response(),
        Err(error) => return internal_error(error).into_response(),
    };
    let _ = state
        .auth_sessions
        .update_many(
            doc! { "uid": read_uid(&user), "revokedAt": { "$exists": false } },
            doc! { "$set": { "revokedAt": BsonDateTime::now() } },
        )
        .await;
    ok::<serde_json::Value>("密码重置成功", serde_json::json!({})).into_response()
}

async fn create_email_code(state: &AppState, email: &str, code_type: &str) -> Result<String> {
    if !is_valid_email(email) {
        anyhow::bail!("请输入有效的邮箱地址");
    }
    let code = format!("{:06}", rand::rng().random_range(100000..=999999));
    let code_hash = hash(&code, DEFAULT_COST)?;
    let now = Utc::now();
    let expires_at = now + TimeDelta::minutes(EMAIL_CODE_TTL_MINUTES);
    state
        .email_codes
        .update_one(
            doc! { "email": email, "type": code_type, "used": false },
            doc! {
                "$set": {
                    "email": email,
                    "type": code_type,
                    "codeHash": code_hash,
                    "createdAt": BsonDateTime::from_millis(now.timestamp_millis()),
                    "expiresAt": BsonDateTime::from_millis(expires_at.timestamp_millis()),
                    "used": false,
                }
            },
        )
        .upsert(true)
        .await?;
    tracing::info!(
        "verification link: {}/api/auth/verify-email?email={}&code={}&type={}",
        state.config.app_base_url.trim_end_matches('/'),
        url_encode(email),
        url_encode(&code),
        url_encode(code_type)
    );
    send_verification_email(&state.config, email, &code, code_type).await?;
    Ok(code)
}

pub async fn consume_email_code(
    state: &AppState,
    email: &str,
    code: &str,
    code_type: &str,
) -> std::result::Result<(), String> {
    let Some(record) = state
        .email_codes
        .find_one(doc! { "email": email, "type": code_type, "used": false, "expiresAt": { "$gt": BsonDateTime::now() } })
        .await
        .map_err(|_| "验证码校验失败".to_string())?
    else {
        return Err("验证码不存在或已过期，请重新发送".to_string());
    };
    if !verify(code, record.get_str("codeHash").unwrap_or_default()).unwrap_or(false) {
        return Err("验证码错误".to_string());
    }
    let object_id = record
        .get_object_id("_id")
        .ok()
        .unwrap_or_else(ObjectId::new);
    let consumed = state
        .email_codes
        .find_one_and_update(
            doc! { "_id": object_id, "used": false, "expiresAt": { "$gt": BsonDateTime::now() } },
            doc! { "$set": { "used": true, "usedAt": BsonDateTime::now() } },
        )
        .return_document(ReturnDocument::Before)
        .await
        .map_err(|_| "验证码校验失败".to_string())?;
    consumed
        .map(|_| ())
        .ok_or_else(|| "验证码已被使用，请重新发送".to_string())
}

async fn create_password_reset_session(state: &AppState, email: &str, code: &str) -> Result<()> {
    let now = Utc::now();
    let expires_at = now + TimeDelta::minutes(RESET_SESSION_TTL_MINUTES);
    state
        .reset_sessions
        .insert_one(doc! {
            "session": format!("password-reset:{}", Uuid::new_v4()),
            "type": "password-reset",
            "email": email,
            "codeHash": hash(code, DEFAULT_COST)?,
            "createdAt": BsonDateTime::from_millis(now.timestamp_millis()),
            "expiresAt": BsonDateTime::from_millis(expires_at.timestamp_millis()),
            "used": false,
        })
        .await?;
    Ok(())
}

async fn consume_password_reset_session(
    state: &AppState,
    email: &str,
    code: &str,
) -> std::result::Result<(), String> {
    let mut cursor = state
        .reset_sessions
        .find(doc! { "type": "password-reset", "email": email, "used": false, "expiresAt": { "$gt": BsonDateTime::now() } })
        .await
        .map_err(|_| "验证码无效或已过期".to_string())?;
    while cursor.advance().await.unwrap_or(false) {
        let session = cursor
            .deserialize_current()
            .map_err(|_| "验证码无效或已过期".to_string())?;
        if !verify(code, session.get_str("codeHash").unwrap_or_default()).unwrap_or(false) {
            continue;
        }
        let object_id = session
            .get_object_id("_id")
            .ok()
            .unwrap_or_else(ObjectId::new);
        let consumed = state
            .reset_sessions
            .find_one_and_update(
                doc! { "_id": object_id, "used": false, "expiresAt": { "$gt": BsonDateTime::now() } },
                doc! { "$set": { "used": true, "usedAt": BsonDateTime::now() } },
            )
            .return_document(ReturnDocument::Before)
            .await
            .map_err(|_| "验证码无效或已过期".to_string())?;
        if consumed.is_some() {
            return Ok(());
        }
    }
    Err("验证码无效或已过期".to_string())
}

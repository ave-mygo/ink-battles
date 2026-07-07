use anyhow::Result;
use axum::{Json, extract::State, http::HeaderMap, response::IntoResponse};
use bcrypt::{DEFAULT_COST, hash, verify};
use mongodb::bson::{Bson, DateTime as BsonDateTime, Document, doc};

use crate::{
    NEW_USER_BONUS,
    email::consume_email_code,
    fcaptcha::verify_fcaptcha,
    models::{LoginPayload, RegisterPayload, UpdateProfilePayload},
    response::{bad_request, internal_error, ok, unauthorized},
    session::{
        append_cookie, clear_auth_cookie, current_session, issue_login_response,
        issue_login_response_with_method,
    },
    state::AppState,
    utils::{is_password_valid, is_valid_email, normalize_email, read_uid, safe_user},
};

pub async fn me(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    match current_session(&state, &headers).await {
        Ok(Some((claims, _))) => match state.users.find_one(doc! { "uid": claims.uid }).await {
            Ok(Some(user)) => {
                let current_login_method = state
                    .auth_sessions
                    .find_one(doc! {
                        "uid": claims.uid,
                        "sessionId": &claims.session_id,
                        "kind": { "$ne": "site" },
                    })
                    .await
                    .ok()
                    .flatten()
                    .and_then(|session| session.get_str("loginMethod").ok().map(ToOwned::to_owned));
                let mut safe_user = safe_user(&user);
                safe_user.current_login_method = current_login_method;
                ok("已登录", safe_user).into_response()
            }
            _ => unauthorized("未登录").into_response(),
        },
        _ => unauthorized("未登录").into_response(),
    }
}

pub async fn login(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<LoginPayload>,
) -> impl IntoResponse {
    if let Err(message) =
        verify_fcaptcha(&state, &headers, payload.fcaptcha_token.as_deref(), "login").await
    {
        return bad_request(&message).into_response();
    }

    let email = normalize_email(&payload.email);
    let Ok(Some(user)) = state.users.find_one(doc! { "email": &email }).await else {
        return bad_request("邮箱或密码错误").into_response();
    };
    let password_hash = user.get_str("passwordHash").unwrap_or_default();
    if password_hash.is_empty() || !verify(&payload.password, password_hash).unwrap_or(false) {
        return bad_request("邮箱或密码错误").into_response();
    }
    let uid = read_uid(&user);
    issue_login_response_with_method(&state, &headers, uid, payload.return_to, Some("email"))
        .await
        .into_response()
}

pub async fn register(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<RegisterPayload>,
) -> impl IntoResponse {
    if let Err(message) = verify_fcaptcha(
        &state,
        &headers,
        payload.fcaptcha_token.as_deref(),
        "register",
    )
    .await
    {
        return bad_request(&message).into_response();
    }

    let email = normalize_email(&payload.email);
    if !is_valid_email(&email) {
        return bad_request("请输入有效的邮箱地址").into_response();
    }
    if payload.password != payload.confirm_password {
        return bad_request("两次输入的密码不一致").into_response();
    }
    if !is_password_valid(&payload.password) {
        return bad_request("密码不符合要求。密码必须至少 10 位，并包含任意 3 种字符类型")
            .into_response();
    }
    if state
        .users
        .find_one(doc! { "email": &email })
        .await
        .ok()
        .flatten()
        .is_some()
    {
        return bad_request("该邮箱已注册").into_response();
    }
    if let Err(message) = consume_email_code(&state, &email, &payload.code, "register").await {
        return bad_request(&message).into_response();
    }

    let uid = match next_uid(&state).await {
        Ok(uid) => uid,
        Err(error) => return internal_error(error).into_response(),
    };
    let now = BsonDateTime::now();
    let password_hash = match hash(&payload.password, DEFAULT_COST) {
        Ok(value) => value,
        Err(error) => return internal_error(error).into_response(),
    };

    if let Err(error) = state
        .users
        .insert_one(doc! {
            "uid": uid,
            "email": &email,
            "passwordHash": password_hash,
            "loginMethod": "email",
            "isActive": true,
            "createdAt": now,
            "updatedAt": now,
        })
        .await
    {
        return internal_error(error).into_response();
    }
    if let Err(error) = ensure_user_billing(&state, uid).await {
        return internal_error(error).into_response();
    }

    issue_login_response_with_method(&state, &headers, uid, payload.return_to, Some("email"))
        .await
        .into_response()
}

pub async fn logout(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    if let Ok(Some((claims, _))) = current_session(&state, &headers).await {
        let _ = state
            .auth_sessions
            .update_one(
                doc! { "uid": claims.uid, "sessionId": claims.session_id },
                doc! { "$set": { "revokedAt": BsonDateTime::now() } },
            )
            .await;
    }
    let mut response = ok::<serde_json::Value>("注销成功", serde_json::json!({})).into_response();
    append_cookie(
        &state.config,
        &mut response,
        clear_auth_cookie(&state.config),
    );
    response
}

pub async fn refresh_session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    match current_session(&state, &headers).await {
        Ok(Some((claims, _))) => issue_login_response(&state, &headers, claims.uid, None)
            .await
            .into_response(),
        _ => unauthorized("未登录").into_response(),
    }
}

pub async fn update_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UpdateProfilePayload>,
) -> impl IntoResponse {
    let Ok(Some((claims, _))) = current_session(&state, &headers).await else {
        return unauthorized("未登录").into_response();
    };

    let mut updates = Document::new();
    if let Some(nickname) = payload.nickname {
        let trimmed_nickname = nickname.trim();
        if trimmed_nickname.chars().count() > 20 {
            return bad_request("昵称不能超过 20 个字符").into_response();
        }
        updates.insert(
            "nickname",
            if trimmed_nickname.is_empty() {
                Bson::Null
            } else {
                Bson::String(trimmed_nickname.to_string())
            },
        );
    }
    if let Some(bio) = payload.bio {
        let trimmed_bio = bio.trim();
        if trimmed_bio.chars().count() > 100 {
            return bad_request("签名不能超过 100 个字符").into_response();
        }
        updates.insert(
            "bio",
            if trimmed_bio.is_empty() {
                Bson::Null
            } else {
                Bson::String(trimmed_bio.to_string())
            },
        );
    }
    updates.insert("updatedAt", BsonDateTime::now());

    if let Err(error) = state
        .users
        .update_one(doc! { "uid": claims.uid }, doc! { "$set": updates })
        .await
    {
        return internal_error(error).into_response();
    }

    ok::<serde_json::Value>("资料更新成功", serde_json::json!({})).into_response()
}

async fn next_uid(state: &AppState) -> Result<i64> {
    let user = state
        .users
        .find_one(doc! {})
        .sort(doc! { "uid": -1 })
        .await?;
    Ok(user.as_ref().map(read_uid).unwrap_or(10000) + 1)
}

async fn ensure_user_billing(state: &AppState, uid: i64) -> Result<()> {
    if state
        .user_billing
        .find_one(doc! { "uid": uid })
        .await?
        .is_some()
    {
        return Ok(());
    }
    let now = BsonDateTime::now();
    state
        .user_billing
        .insert_one(doc! {
            "uid": uid,
            "totalAmount": 0.0,
            "grantCallsBalance": 0,
            "paidCallsBalance": NEW_USER_BONUS,
            "lastGrantRefresh": now,
            "createdAt": now,
            "updatedAt": now,
        })
        .await?;
    Ok(())
}

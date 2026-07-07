use anyhow::{Context, Result, anyhow};
use axum::{
    Json,
    extract::{Path, State},
    http::HeaderMap,
    response::IntoResponse,
};
use bcrypt::verify;
use chrono::{TimeDelta, Utc};
use mongodb::bson::{DateTime as BsonDateTime, Document, doc};
use uuid::Uuid;

use crate::{
    models::{OAuthPendingActionPayload, OAuthPendingIdentity},
    password_crypto::resolve_password,
    response::{bad_request, ok},
    session::issue_login_response_with_method,
    state::AppState,
    utils::{normalize_email, read_uid},
};

use super::{
    accounts::{bind_provider_identity, create_provider_user},
    types::{OAuthProvider, ProviderIdentity, parse_provider, provider_key},
};

const OAUTH_PENDING_TTL_MINUTES: i64 = 10;

pub(super) async fn create_pending_identity(
    state: &AppState,
    provider: OAuthProvider,
    identity: &ProviderIdentity,
    return_to: &str,
    has_return_to: bool,
) -> Result<String> {
    let ticket = Uuid::new_v4().to_string();
    let now = Utc::now();
    state
        .oauth_states
        .insert_one(doc! {
            "state": &ticket,
            "kind": "pending_oauth_identity",
            "provider": provider_key(provider),
            "externalId": &identity.external_id,
            "nickname": &identity.nickname,
            "avatar": &identity.avatar,
            "returnTo": return_to,
            "hasReturnTo": has_return_to,
            "createdAt": BsonDateTime::from_millis(now.timestamp_millis()),
            "expiresAt": BsonDateTime::from_millis((now + TimeDelta::minutes(OAUTH_PENDING_TTL_MINUTES)).timestamp_millis()),
        })
        .await?;
    Ok(ticket)
}

pub async fn pending_identity(
    State(state): State<AppState>,
    Path(ticket): Path<String>,
) -> impl IntoResponse {
    match read_pending_identity(&state, &ticket).await {
        Ok((pending, provider, identity)) => ok(
            "待处理第三方身份",
            OAuthPendingIdentity {
                ticket,
                provider: provider_key(provider).to_string(),
                nickname: identity.nickname,
                avatar: identity.avatar,
                return_to: pending_return_to(&pending),
            },
        )
        .into_response(),
        Err(error) => bad_request(&error.to_string()).into_response(),
    }
}

pub async fn complete_pending_identity(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<OAuthPendingActionPayload>,
) -> impl IntoResponse {
    let (pending, provider, identity) = match read_pending_identity(&state, &payload.ticket).await {
        Ok(value) => value,
        Err(error) => return bad_request(&error.to_string()).into_response(),
    };

    let uid = match payload.action.as_str() {
        "create" => create_provider_user(&state, provider, &identity).await,
        "bind" => bind_existing_user(&state, provider, &identity, &payload).await,
        _ => Err(anyhow!("未知第三方账号处理方式")),
    };
    let uid = match uid {
        Ok(value) => value,
        Err(error) => return bad_request(&error.to_string()).into_response(),
    };

    let _ = state
        .oauth_states
        .delete_one(doc! { "state": &payload.ticket })
        .await;
    let return_to = pending_return_to(&pending).or(payload.return_to);
    issue_login_response_with_method(
        &state,
        &headers,
        uid,
        return_to,
        Some(provider_key(provider)),
    )
    .await
    .into_response()
}

async fn read_pending_identity(
    state: &AppState,
    ticket: &str,
) -> Result<(Document, OAuthProvider, ProviderIdentity)> {
    let pending = state
        .oauth_states
        .find_one(doc! {
            "state": ticket,
            "kind": "pending_oauth_identity",
            "expiresAt": { "$gt": BsonDateTime::now() },
        })
        .await?
        .context("第三方登录状态已失效，请重新登录")?;
    let provider = parse_provider(pending.get_str("provider").unwrap_or_default())
        .context("第三方登录方式无效")?;
    let identity = ProviderIdentity {
        external_id: pending
            .get_str("externalId")
            .context("第三方身份缺少唯一标识")?
            .to_string(),
        nickname: pending.get_str("nickname").ok().map(ToOwned::to_owned),
        avatar: pending.get_str("avatar").ok().map(ToOwned::to_owned),
    };
    Ok((pending, provider, identity))
}

async fn bind_existing_user(
    state: &AppState,
    provider: OAuthProvider,
    identity: &ProviderIdentity,
    payload: &OAuthPendingActionPayload,
) -> Result<i64> {
    let email = normalize_email(payload.email.as_deref().unwrap_or_default());
    let password = resolve_password(
        &state.password_crypto,
        payload.password.as_deref(),
        payload.password_ciphertext.as_deref(),
        payload.password_key_id.as_deref(),
    )?;
    let user = state
        .users
        .find_one(doc! { "email": &email })
        .await?
        .context("邮箱或密码错误")?;
    let password_hash = user.get_str("passwordHash").unwrap_or_default();
    if password_hash.is_empty() || !verify(&password, password_hash).unwrap_or(false) {
        return Err(anyhow!("邮箱或密码错误"));
    }
    let uid = read_uid(&user);
    bind_provider_identity(state, uid, provider, identity).await?;
    Ok(uid)
}

fn pending_return_to(pending: &Document) -> Option<String> {
    if !pending.get_bool("hasReturnTo").unwrap_or(false) {
        return None;
    }
    pending.get_str("returnTo").ok().map(ToOwned::to_owned)
}

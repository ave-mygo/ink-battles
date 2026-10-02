use anyhow::{Context, Result};
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::{IntoResponse, Redirect, Response},
};
use chrono::{TimeDelta, Utc};
use mongodb::bson::{DateTime as BsonDateTime, doc};
use uuid::Uuid;

use crate::{
    models::{OAuthCallbackQuery, OAuthStartQuery},
    response::{bad_request, internal_error, unauthorized},
    session::{append_cookie, current_session, issue_auth_cookie_with_method},
    state::AppState,
    utils::{sanitize_return_url, url_encode},
};

use super::{
    accounts::{bind_provider_identity, find_provider_user},
    pending::create_pending_identity,
    providers::{fetch_provider_identity, provider_authorize_url},
    types::{OAuthMethod, OAuthProvider, method_key, parse_method, parse_provider, provider_key},
};

const OAUTH_STATE_TTL_MINUTES: i64 = 10;

pub async fn oauth_start(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    headers: HeaderMap,
    Query(query): Query<OAuthStartQuery>,
) -> impl IntoResponse {
    let Some(provider) = parse_provider(&provider) else {
        return bad_request("未知第三方登录方式").into_response();
    };
    let method = parse_method(query.method.as_deref());
    if method == OAuthMethod::Bind
        && current_session(&state, &headers)
            .await
            .ok()
            .flatten()
            .is_none()
    {
        return unauthorized("请先登录认证中心后再绑定账号").into_response();
    }

    let state_id = Uuid::new_v4().to_string();
    let has_return_to = query.return_to.is_some();
    let return_to = sanitize_return_url(&state.config, query.return_to);
    let now = Utc::now();
    if let Err(error) = state
    .oauth_states
    .insert_one(doc! {
      "state": &state_id,
      "provider": provider_key(provider),
      "method": method_key(method),
      "returnTo": return_to,
      "hasReturnTo": has_return_to,
      "inviteCode": query.invite_code,
      "createdAt": BsonDateTime::from_millis(now.timestamp_millis()),
      "expiresAt": BsonDateTime::from_millis((now + TimeDelta::minutes(OAUTH_STATE_TTL_MINUTES)).timestamp_millis()),
    })
    .await
  {
    return internal_error(error).into_response();
  }

    match provider_authorize_url(&state, provider, &state_id) {
        Ok(url) => Redirect::temporary(&url).into_response(),
        Err(error) => bad_request(&error.to_string()).into_response(),
    }
}

pub async fn oauth_callback(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    headers: HeaderMap,
    Query(query): Query<OAuthCallbackQuery>,
) -> impl IntoResponse {
    let Some(provider) = parse_provider(&provider) else {
        return redirect_to_panel_error("未知第三方登录方式");
    };
    let Some(code) = query.code else {
        return redirect_to_panel_error("缺少授权码");
    };
    let Some(state_id) = query.state else {
        return redirect_to_panel_error("缺少授权状态");
    };

    match complete_oauth_callback(&state, &headers, provider, &code, &state_id).await {
        Ok(response) => response,
        Err(error) => redirect_to_panel_error(&error.to_string()),
    }
}

async fn complete_oauth_callback(
    state: &AppState,
    headers: &HeaderMap,
    provider: OAuthProvider,
    code: &str,
    state_id: &str,
) -> Result<Response> {
    let state_doc = state
        .oauth_states
        .find_one(doc! {
          "state": state_id,
          "provider": provider_key(provider),
          "expiresAt": { "$gt": BsonDateTime::now() },
        })
        .await?
        .context("授权状态已失效，请重新发起登录")?;
    let _ = state
        .oauth_states
        .delete_one(doc! { "state": state_id })
        .await;

    let method = parse_method(state_doc.get_str("method").ok());
    let return_to = state_doc
        .get_str("returnTo")
        .ok()
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| state.config.default_return_url.clone());
    let has_return_to = state_doc.get_bool("hasReturnTo").unwrap_or(true);
    let identity = fetch_provider_identity(state, provider, code).await?;

    if method == OAuthMethod::Bind {
        let (claims, _) = current_session(state, headers)
            .await?
            .context("请先登录认证中心后再绑定账号")?;
        bind_provider_identity(state, claims.uid, provider, &identity).await?;
        return Ok(Redirect::temporary("/dashboard?oauth_bind=success").into_response());
    }

    let Some(uid) = find_provider_user(state, provider, &identity).await? else {
        let ticket =
            create_pending_identity(state, provider, &identity, &return_to, has_return_to).await?;
        return Ok(
            Redirect::temporary(&format!("/oauth/complete?ticket={}", url_encode(&ticket)))
                .into_response(),
        );
    };
    let token =
        issue_auth_cookie_with_method(state, headers, uid, Some(provider_key(provider))).await?;
    let redirect_url = if has_return_to {
        format!("/authorize?returnTo={}", url_encode(&return_to))
    } else {
        "/dashboard".to_string()
    };
    let mut response = Redirect::temporary(&redirect_url).into_response();
    append_cookie(
        &state.config,
        &mut response,
        crate::session::named_auth_cookie(&state.config, &state.config.cookie_name, &token),
    );
    Ok(response)
}

fn redirect_to_panel_error(message: &str) -> Response {
    Redirect::temporary(&format!("/?error={}", url_encode(message))).into_response()
}

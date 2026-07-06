use anyhow::{Result, anyhow};
use axum::{Json, extract::State, http::HeaderMap, response::IntoResponse};
use bcrypt::{DEFAULT_COST, hash};
use mongodb::bson::{DateTime as BsonDateTime, Document, doc};

use crate::{
    NEW_USER_BONUS,
    email::consume_email_code,
    models::{AccountBindingItem, AccountBindings, BindEmailPayload, UnbindProviderPayload},
    response::{bad_request, internal_error, ok, unauthorized},
    session::current_session,
    state::AppState,
    utils::{is_password_valid, normalize_email, read_uid},
};

use super::types::{
    OAuthProvider, ProviderIdentity, method_login_value, provider_field, provider_key,
};

pub async fn account_details(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let Some(user) = current_user_document(&state, &headers).await else {
        return unauthorized("未登录").into_response();
    };

    ok(
        "账号绑定详情",
        AccountBindings {
            email: binding_item(&user, "email"),
            qq: binding_item(&user, "qqOpenid"),
            afdian: binding_item(&user, "afdId"),
            login_method: user.get_str("loginMethod").ok().map(ToOwned::to_owned),
        },
    )
    .into_response()
}

pub async fn bind_email(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<BindEmailPayload>,
) -> impl IntoResponse {
    let Some(user) = current_user_document(&state, &headers).await else {
        return unauthorized("未登录").into_response();
    };
    let uid = read_uid(&user);
    let email = normalize_email(&payload.email);

    if !is_password_valid(&payload.password) {
        return bad_request("密码强度不足，至少需要 10 位并包含任意 3 种字符类型").into_response();
    }
    if let Err(message) = consume_email_code(&state, &email, &payload.code, "register").await {
        return bad_request(&message).into_response();
    }
    if let Ok(Some(existing)) = state.users.find_one(doc! { "email": &email }).await {
        if read_uid(&existing) != uid {
            return bad_request("该邮箱已被其他用户使用").into_response();
        }
    }
    if user.get_str("email").is_ok() {
        return bad_request("您已绑定邮箱，请先解绑").into_response();
    }

    let password_hash = match hash(&payload.password, DEFAULT_COST) {
        Ok(value) => value,
        Err(error) => return internal_error(error).into_response(),
    };

    match state
    .users
    .update_one(
      doc! { "uid": uid },
      doc! { "$set": { "email": email, "passwordHash": password_hash, "updatedAt": BsonDateTime::now() } },
    )
    .await
  {
    Ok(_) => ok::<serde_json::Value>("邮箱绑定成功", serde_json::json!({})).into_response(),
    Err(error) => internal_error(error).into_response(),
  }
}

pub async fn unbind_provider(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<UnbindProviderPayload>,
) -> impl IntoResponse {
    let Some(user) = current_user_document(&state, &headers).await else {
        return unauthorized("未登录").into_response();
    };
    let provider = payload.provider.as_str();
    let field = match provider {
        "email" => "email",
        "qq" => "qqOpenid",
        "afdian" => "afdId",
        _ => return bad_request("未知账号类型").into_response(),
    };
    if user.get_str(field).is_err() {
        return bad_request("账号尚未绑定").into_response();
    }
    if !can_unbind(&user, provider) {
        return bad_request("至少需要保留一种登录方式").into_response();
    }

    let mut unset = doc! { field: "" };
    if provider == "email" {
        unset.insert("passwordHash", "");
    }

    match state
        .users
        .update_one(
            doc! { "uid": read_uid(&user) },
            doc! { "$unset": unset, "$set": { "updatedAt": BsonDateTime::now() } },
        )
        .await
    {
        Ok(_) => ok::<serde_json::Value>("解绑成功", serde_json::json!({})).into_response(),
        Err(error) => internal_error(error).into_response(),
    }
}

pub(super) async fn find_provider_user(
    state: &AppState,
    provider: OAuthProvider,
    identity: &ProviderIdentity,
) -> Result<Option<i64>> {
    Ok(
        find_user_by_provider(state, provider, &identity.external_id)
            .await?
            .map(|user| read_uid(&user)),
    )
}

pub(super) async fn create_provider_user(
    state: &AppState,
    provider: OAuthProvider,
    identity: &ProviderIdentity,
) -> Result<i64> {
    let uid = next_uid(state).await?;
    let now = BsonDateTime::now();
    let mut user = doc! {
      "uid": uid,
      "loginMethod": method_login_value(provider),
      "isActive": true,
      "createdAt": now,
      "updatedAt": now,
    };
    set_provider_fields(&mut user, provider, identity);
    state.users.insert_one(user).await?;
    ensure_user_billing(state, uid).await?;
    Ok(uid)
}

pub(super) async fn bind_provider_identity(
    state: &AppState,
    uid: i64,
    provider: OAuthProvider,
    identity: &ProviderIdentity,
) -> Result<()> {
    if let Some(existing) = find_user_by_provider(state, provider, &identity.external_id).await? {
        if read_uid(&existing) != uid {
            return Err(anyhow!("该第三方账号已被其他用户绑定"));
        }
    }

    let mut update = doc! { "updatedAt": BsonDateTime::now() };
    set_provider_fields(&mut update, provider, identity);
    state
        .users
        .update_one(doc! { "uid": uid }, doc! { "$set": update })
        .await?;
    Ok(())
}

async fn current_user_document(state: &AppState, headers: &HeaderMap) -> Option<Document> {
    let (claims, _) = current_session(state, headers).await.ok().flatten()?;
    state
        .users
        .find_one(doc! { "uid": claims.uid })
        .await
        .ok()
        .flatten()
}

async fn find_user_by_provider(
    state: &AppState,
    provider: OAuthProvider,
    external_id: &str,
) -> Result<Option<Document>> {
    Ok(state
        .users
        .find_one(doc! { provider_field(provider): external_id })
        .await?)
}

fn set_provider_fields(
    target: &mut Document,
    provider: OAuthProvider,
    identity: &ProviderIdentity,
) {
    target.insert(provider_field(provider), identity.external_id.clone());
    if let Some(nickname) = &identity.nickname {
        target.insert("nickname", nickname);
    }
    if let Some(avatar) = &identity.avatar {
        target.insert("avatar", avatar);
    }
}

fn binding_item(user: &Document, field: &str) -> AccountBindingItem {
    let value = user.get_str(field).ok().map(ToOwned::to_owned);
    AccountBindingItem {
        bound: value.is_some(),
        value,
    }
}

fn can_unbind(user: &Document, provider: &str) -> bool {
    let email = user.get_str("email").is_ok() && provider != "email";
    let qq = user.get_str(provider_field(OAuthProvider::Qq)).is_ok()
        && provider != provider_key(OAuthProvider::Qq);
    let afdian = user.get_str(provider_field(OAuthProvider::Afdian)).is_ok()
        && provider != provider_key(OAuthProvider::Afdian);
    email || qq || afdian
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

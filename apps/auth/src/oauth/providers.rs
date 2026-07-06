use anyhow::{Context, Result, anyhow};

use crate::{state::AppState, utils::url_encode};

use super::types::{AfdianTokenResponse, OAuthProvider, ProviderIdentity, QqApiResponse};

pub(super) async fn fetch_provider_identity(
    state: &AppState,
    provider: OAuthProvider,
    code: &str,
) -> Result<ProviderIdentity> {
    match provider {
        OAuthProvider::Qq => fetch_qq_identity(code).await,
        OAuthProvider::Afdian => fetch_afdian_identity(state, code).await,
    }
}

pub(super) fn provider_authorize_url(
    state: &AppState,
    provider: OAuthProvider,
    state_id: &str,
) -> Result<String> {
    match provider {
        OAuthProvider::Qq => {
            let callback = format!(
                "{}/api/auth/oauth/qq/callback",
                state.config.app_base_url.trim_end_matches('/')
            );
            Ok(format!(
                "https://api-space.tnxg.top/oauth/qq/authorize?redirect=true&return_url={}&state={}",
                url_encode(&callback),
                url_encode(state_id)
            ))
        }
        OAuthProvider::Afdian => {
            let client_id = state
                .config
                .afdian_client_id
                .clone()
                .context("未配置爱发电 client_id")?;
            Ok(format!(
                "https://ifdian.net/oauth2/authorize?response_type=code&scope=basic&client_id={}&redirect_uri={}&state={}",
                url_encode(&client_id),
                url_encode(&afdian_redirect_uri(state)),
                url_encode(state_id)
            ))
        }
    }
}

pub(super) fn afdian_redirect_uri(state: &AppState) -> String {
    state.config.afdian_redirect_uri.clone().unwrap_or_else(|| {
        format!(
            "{}/api/auth/oauth/afdian/callback",
            state.config.app_base_url.trim_end_matches('/')
        )
    })
}

async fn fetch_qq_identity(code: &str) -> Result<ProviderIdentity> {
    let response = reqwest::get(format!("https://api-space.tnxg.top/user/get?code={code}"))
        .await?
        .json::<QqApiResponse>()
        .await?;

    if response.status != "success" {
        return Err(anyhow!(
            response
                .message
                .unwrap_or_else(|| "获取 QQ 用户信息失败".to_string())
        ));
    }

    let data = response.data.context("QQ 用户信息为空")?;
    Ok(ProviderIdentity {
        external_id: data.qq_openid,
        nickname: data.nickname,
        avatar: data.avatar,
    })
}

async fn fetch_afdian_identity(state: &AppState, code: &str) -> Result<ProviderIdentity> {
    let client_id = state
        .config
        .afdian_client_id
        .clone()
        .context("未配置爱发电 client_id")?;
    let client_secret = state
        .config
        .afdian_client_secret
        .clone()
        .context("未配置爱发电 client_secret")?;
    let redirect_uri = afdian_redirect_uri(state);
    let response = reqwest::Client::new()
        .post("https://ifdian.net/api/oauth2/access_token")
        .form(&[
            ("grant_type", "authorization_code"),
            ("client_id", client_id.as_str()),
            ("client_secret", client_secret.as_str()),
            ("redirect_uri", redirect_uri.as_str()),
            ("code", code),
        ])
        .send()
        .await?
        .json::<AfdianTokenResponse>()
        .await?;

    if response.ec != 200 {
        return Err(anyhow!(
            response
                .em
                .unwrap_or_else(|| "获取爱发电用户信息失败".to_string())
        ));
    }

    let data = response.data.context("爱发电用户信息为空")?;
    Ok(ProviderIdentity {
        external_id: data.user_id,
        nickname: data.name,
        avatar: data.avatar,
    })
}

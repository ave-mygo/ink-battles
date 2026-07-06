use serde::Deserialize;

#[derive(Clone, Copy, PartialEq)]
pub(super) enum OAuthProvider {
    Qq,
    Afdian,
}

#[derive(Clone, Copy, PartialEq)]
pub(super) enum OAuthMethod {
    Signin,
    Signup,
    Bind,
}

pub(super) struct ProviderIdentity {
    pub external_id: String,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct QqApiResponse {
    pub status: String,
    pub message: Option<String>,
    pub data: Option<QqUserInfo>,
}

#[derive(Deserialize)]
pub(super) struct QqUserInfo {
    pub qq_openid: String,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct AfdianTokenResponse {
    pub ec: i32,
    pub em: Option<String>,
    pub data: Option<AfdianUserInfo>,
}

#[derive(Deserialize)]
pub(super) struct AfdianUserInfo {
    pub user_id: String,
    pub name: Option<String>,
    pub avatar: Option<String>,
}

pub(super) fn parse_provider(value: &str) -> Option<OAuthProvider> {
    match value {
        "qq" => Some(OAuthProvider::Qq),
        "afdian" => Some(OAuthProvider::Afdian),
        _ => None,
    }
}

pub(super) fn parse_method(value: Option<&str>) -> OAuthMethod {
    match value {
        Some("signup") => OAuthMethod::Signup,
        Some("bind") => OAuthMethod::Bind,
        _ => OAuthMethod::Signin,
    }
}

pub(super) fn provider_key(provider: OAuthProvider) -> &'static str {
    match provider {
        OAuthProvider::Qq => "qq",
        OAuthProvider::Afdian => "afdian",
    }
}

pub(super) fn provider_field(provider: OAuthProvider) -> &'static str {
    match provider {
        OAuthProvider::Qq => "qqOpenid",
        OAuthProvider::Afdian => "afdId",
    }
}

pub(super) fn method_key(method: OAuthMethod) -> &'static str {
    match method {
        OAuthMethod::Signin => "signin",
        OAuthMethod::Signup => "signup",
        OAuthMethod::Bind => "bind",
    }
}

pub(super) fn method_login_value(provider: OAuthProvider) -> &'static str {
    match provider {
        OAuthProvider::Qq => "qq",
        OAuthProvider::Afdian => "afd",
    }
}

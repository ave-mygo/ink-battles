use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub uid: i64,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub exp: usize,
}

#[derive(Deserialize)]
pub struct SendCodePayload {
    pub email: String,
    #[serde(rename = "type")]
    pub code_type: Option<String>,
    #[serde(rename = "fcaptchaToken")]
    pub fcaptcha_token: Option<String>,
}

#[derive(Deserialize)]
pub struct EmailPayload {
    pub email: String,
    #[serde(rename = "fcaptchaToken")]
    pub fcaptcha_token: Option<String>,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
    #[serde(rename = "fcaptchaToken")]
    pub fcaptcha_token: Option<String>,
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[derive(Deserialize)]
pub struct AuthorizePayload {
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub email: String,
    pub password: String,
    #[serde(rename = "confirmPassword")]
    pub confirm_password: String,
    pub code: String,
    #[serde(rename = "fcaptchaToken")]
    pub fcaptcha_token: Option<String>,
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[derive(Deserialize)]
pub struct VerifyCodePayload {
    pub email: String,
    pub code: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordPayload {
    pub email: String,
    pub code: String,
    pub password: String,
    #[serde(rename = "confirmPassword")]
    pub confirm_password: String,
    #[serde(rename = "fcaptchaToken")]
    pub fcaptcha_token: Option<String>,
}

#[derive(Deserialize)]
pub struct VerifyEmailQuery {
    pub email: String,
    pub code: String,
    #[serde(rename = "type")]
    pub code_type: Option<String>,
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[derive(Deserialize)]
pub struct OAuthStartQuery {
    pub method: Option<String>,
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
    #[serde(rename = "inviteCode")]
    pub invite_code: Option<String>,
}

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
}

#[derive(Deserialize)]
pub struct BindEmailPayload {
    pub email: String,
    pub password: String,
    pub code: String,
    #[serde(rename = "fcaptchaToken")]
    pub fcaptcha_token: Option<String>,
}

#[derive(Deserialize)]
pub struct UnbindProviderPayload {
    pub provider: String,
}

#[derive(Deserialize)]
pub struct UpdateProfilePayload {
    pub nickname: Option<String>,
    pub bio: Option<String>,
}

#[derive(Deserialize)]
pub struct OAuthPendingActionPayload {
    pub ticket: String,
    pub action: String,
    pub email: Option<String>,
    pub password: Option<String>,
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

#[derive(Serialize)]
pub struct LoginResponse {
    #[serde(rename = "returnTo")]
    pub return_to: String,
}

#[derive(Serialize)]
pub struct IntrospectionResponse {
    pub active: bool,
    pub uid: Option<i64>,
    #[serde(rename = "sessionId")]
    pub session_id: Option<String>,
}

#[derive(Serialize)]
pub struct SafeUser {
    pub uid: i64,
    pub email: Option<String>,
    #[serde(rename = "loginMethod")]
    pub login_method: Option<String>,
    #[serde(rename = "currentLoginMethod", skip_serializing_if = "Option::is_none")]
    pub current_login_method: Option<String>,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    pub nickname: Option<String>,
    pub bio: Option<String>,
    pub avatar: String,
    #[serde(rename = "isAdmin")]
    pub is_admin: bool,
    #[serde(rename = "isHonoraryWriter")]
    pub is_honorary_writer: bool,
    #[serde(rename = "canReviewExcellentSentences")]
    pub can_review_excellent_sentences: bool,
}

#[derive(Serialize)]
pub struct AccountBindingItem {
    pub bound: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

#[derive(Serialize)]
pub struct AccountBindings {
    pub email: AccountBindingItem,
    pub qq: AccountBindingItem,
    pub afdian: AccountBindingItem,
    #[serde(rename = "loginMethod")]
    pub login_method: Option<String>,
}

#[derive(Serialize)]
pub struct OAuthPendingIdentity {
    pub ticket: String,
    pub provider: String,
    pub nickname: Option<String>,
    pub avatar: Option<String>,
    #[serde(rename = "returnTo")]
    pub return_to: Option<String>,
}

#[derive(Serialize)]
pub struct SessionInfo {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "expiresAt")]
    pub expires_at: String,
    #[serde(rename = "userAgent")]
    pub user_agent: Option<String>,
    pub current: bool,
}

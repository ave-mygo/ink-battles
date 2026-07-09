use std::{env, net::SocketAddr, sync::Arc, time::Duration};

use anyhow::Result;
use axum::{
    Router,
    routing::{delete, get, patch, post},
};
use mongodb::{Client, options::ClientOptions};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{EnvFilter, fmt};

mod account;
mod assets;
mod config;
mod email;
mod mail;
mod models;
mod oauth;
mod password_crypto;
mod response;
mod session;
mod state;
mod turnstile;
mod utils;

use account::{login, logout, me, refresh_session, register, update_profile};
use assets::static_handler;
use config::{AppConfig, cors_layer};
use email::{
    forgot_password, reset_password, send_verification_code, verify_email_link, verify_reset_code,
};
use oauth::{
    account_details, bind_email, complete_pending_identity, oauth_callback, oauth_start,
    pending_identity, unbind_provider,
};
use response::ok;
use session::{authorize_site, introspect_site_session, list_sessions, revoke_session};
use state::{AppState, ensure_indexes};

const SESSION_TTL_SECONDS: i64 = 7 * 24 * 60 * 60;
const EMAIL_CODE_TTL_MINUTES: i64 = 5;
const EMAIL_CODE_COOLDOWN_SECONDS: i64 = 60;
const RESET_SESSION_TTL_MINUTES: i64 = 10;
const NEW_USER_BONUS: i32 = 25;

#[tokio::main]
async fn main() -> Result<()> {
    if env::args().any(|argument| argument == "--healthcheck") {
        return healthcheck().await;
    }

    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info")),
        )
        .init();

    let config = Arc::new(AppConfig::from_config()?);
    tracing::info!(
        config_path = %config.config_path.display(),
        database = %config.database_name,
        app_base_url = %config.app_base_url,
        turnstile_enabled = config.turnstile_enabled,
        "ink auth service config loaded"
    );
    let client = Client::with_options(ClientOptions::parse(&config.mongodb_uri).await?)?;
    let database = client.database(&config.database_name);
    let state = AppState::new(Arc::clone(&config), database)?;

    ensure_indexes(&state).await?;
    tracing::info!("ink auth service database indexes ensured");

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/auth/me", get(me))
        .route("/api/auth/password-key", get(password_key))
        .route("/api/auth/profile", patch(update_profile))
        .route("/api/auth/login", post(login))
        .route("/api/auth/register", post(register))
        .route("/api/auth/logout", post(logout))
        .route("/api/auth/authorize", post(authorize_site))
        .route("/api/auth/introspect", post(introspect_site_session))
        .route("/api/auth/refresh-session", post(refresh_session))
        .route(
            "/api/auth/send-verification-code",
            post(send_verification_code),
        )
        .route("/api/auth/verify-email", get(verify_email_link))
        .route("/api/auth/forgot-password", post(forgot_password))
        .route("/api/auth/verify-reset-code", post(verify_reset_code))
        .route("/api/auth/reset-password", post(reset_password))
        .route("/api/auth/accounts/details", get(account_details))
        .route("/api/auth/accounts/bind-email", post(bind_email))
        .route("/api/auth/accounts/unbind", post(unbind_provider))
        .route("/api/auth/oauth/{provider}/start", get(oauth_start))
        .route("/api/auth/oauth/{provider}/callback", get(oauth_callback))
        .route("/api/auth/oauth/pending/{ticket}", get(pending_identity))
        .route(
            "/api/auth/oauth/pending/complete",
            post(complete_pending_identity),
        )
        .route("/api/auth/sessions", get(list_sessions))
        .route("/api/auth/sessions/{session_id}", delete(revoke_session))
        .fallback(static_handler)
        .layer(cors_layer(&config)?)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let address: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    let listener = tokio::net::TcpListener::bind(address).await?;
    tracing::info!(
        listen = %address,
        panel = "panel/out",
        "ink auth service listening"
    );
    axum::serve(listener, app).await?;
    Ok(())
}

async fn healthcheck() -> Result<()> {
    let url = env::var("AUTH_HEALTHCHECK_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:3100/api/health".to_string());
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()?;
    let response = client.get(url).send().await?;
    if response.status().is_success() {
        return Ok(());
    }
    anyhow::bail!("auth healthcheck failed with status {}", response.status())
}

async fn health() -> axum::Json<models::ApiResponse<serde_json::Value>> {
    ok(
        "认证服务运行正常",
        serde_json::json!({ "service": "ink-auth-service" }),
    )
}

async fn password_key(
    axum::extract::State(state): axum::extract::State<AppState>,
) -> axum::Json<models::ApiResponse<password_crypto::PasswordKeyResponse>> {
    ok("密码加密公钥", state.password_crypto.public_key_response())
}

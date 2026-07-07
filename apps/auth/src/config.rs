use std::{env, fs, path::PathBuf};

use anyhow::{Context, Result};
use axum::http::{HeaderValue, Method, header};
use serde::Deserialize;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub database_name: String,
    pub mongodb_uri: String,
    pub jwt_secret: String,
    pub cookie_name: String,
    pub site_cookie_name: String,
    pub cookie_domain: Option<String>,
    pub cookie_secure: bool,
    pub app_base_url: String,
    pub default_return_url: String,
    pub allowed_return_origins: Vec<String>,
    pub allowed_cors_origins: Vec<String>,
    pub smtp_host: Option<String>,
    pub smtp_port: u16,
    pub smtp_user: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_from_name: String,
    pub fcaptcha_enabled: bool,
    pub fcaptcha_site_key: Option<String>,
    pub fcaptcha_secret: Option<String>,
    pub fcaptcha_max_score: f64,
    pub fcaptcha_verify_ip_hash: bool,
    pub afdian_client_id: Option<String>,
    pub afdian_client_secret: Option<String>,
    pub afdian_redirect_uri: Option<String>,
    pub config_path: PathBuf,
}

#[derive(Deserialize, Default)]
struct RootConfig {
    auth: Option<AuthSection>,
    mongodb: Option<MongodbSection>,
    jwt: Option<JwtSection>,
    email: Option<EmailSection>,
    afdian: Option<AfdianSection>,
    app: Option<AppSection>,
    server: Option<ServerSection>,
}

#[derive(Deserialize, Default)]
struct AuthSection {
    host: Option<String>,
    port: Option<u16>,
    mongodb_database: Option<String>,
    cookie_name: Option<String>,
    site_cookie_name: Option<String>,
    cookie_domain: Option<String>,
    cookie_secure: Option<bool>,
    app_base_url: Option<String>,
    default_return_url: Option<String>,
    allowed_return_origins: Option<Vec<String>>,
    allowed_origins: Option<Vec<String>>,
    smtp_from_name: Option<String>,
    fcaptcha_enabled: Option<bool>,
    fcaptcha_server_url: Option<String>,
    fcaptcha_site_key: Option<String>,
    fcaptcha_secret: Option<String>,
    fcaptcha_max_score: Option<f64>,
    fcaptcha_verify_ip_hash: Option<bool>,
}

#[derive(Deserialize)]
struct MongodbSection {
    host: String,
    port: u16,
    user: Option<String>,
    password: Option<String>,
    #[serde(rename = "directConnection")]
    direct_connection: Option<bool>,
}

#[derive(Deserialize)]
struct JwtSection {
    secret: String,
}

#[derive(Deserialize)]
struct EmailSection {
    host: String,
    port: u16,
    user: String,
    password: String,
}

#[derive(Deserialize)]
struct AfdianSection {
    client_id: Option<String>,
    client_secret: Option<String>,
    redirect_uri: Option<String>,
}

#[derive(Deserialize)]
struct AppSection {
    base_url: String,
}

#[derive(Deserialize)]
struct ServerSection {
    allowed_origins: Option<Vec<String>>,
}

impl AppConfig {
    pub fn from_config() -> Result<Self> {
        let config_path = resolve_config_path()?;
        let content = fs::read_to_string(&config_path)
            .with_context(|| format!("读取配置文件失败: {}", config_path.display()))?;
        let root: RootConfig = toml::from_str(&content)
            .with_context(|| format!("解析配置文件失败: {}", config_path.display()))?;
        let auth = root.auth.unwrap_or_default();

        let jwt_secret = root
            .jwt
            .map(|section| section.secret)
            .context("jwt.secret 必须配置")?;
        if jwt_secret.as_bytes().len() < 32 {
            anyhow::bail!("jwt.secret 至少需要 32 字节");
        }

        let app_site_base_url = root
            .app
            .as_ref()
            .map(|section| trim_trailing_slash(&section.base_url));
        let default_return_url = auth.default_return_url.unwrap_or_else(|| {
            app_site_base_url
                .as_ref()
                .map(|base_url| format!("{base_url}/dashboard"))
                .unwrap_or_else(|| "http://localhost:3000/dashboard".to_string())
        });
        let default_return_origin = app_site_base_url
            .as_deref()
            .map(origin_from_base_url)
            .unwrap_or_else(|| "http://localhost:3000".to_string());

        let allowed_cors_origins = auth
            .allowed_origins
            .or_else(|| root.server.and_then(|section| section.allowed_origins))
            .unwrap_or_else(|| {
                vec![
                    "http://localhost:3000".to_string(),
                    "http://localhost:3101".to_string(),
                ]
            });

        let email = root.email;
        let afdian = root.afdian;

        Ok(Self {
            host: auth.host.unwrap_or_else(|| "0.0.0.0".to_string()),
            port: auth.port.unwrap_or(3100),
            database_name: auth
                .mongodb_database
                .unwrap_or_else(|| "ink_battles".to_string()),
            mongodb_uri: mongodb_uri(root.mongodb),
            jwt_secret,
            cookie_name: auth
                .cookie_name
                .unwrap_or_else(|| "auth-sso-token".to_string()),
            site_cookie_name: auth
                .site_cookie_name
                .unwrap_or_else(|| "auth-token".to_string()),
            cookie_domain: auth.cookie_domain.filter(|value| !value.trim().is_empty()),
            cookie_secure: auth.cookie_secure.unwrap_or(false),
            app_base_url: auth
                .app_base_url
                .map(|value| trim_trailing_slash(&value))
                .unwrap_or_else(|| "http://localhost:3100".to_string()),
            default_return_url,
            allowed_return_origins: auth
                .allowed_return_origins
                .unwrap_or_else(|| vec![default_return_origin]),
            allowed_cors_origins,
            smtp_host: email
                .as_ref()
                .map(|section| section.host.clone())
                .filter(|value| !value.trim().is_empty()),
            smtp_port: email.as_ref().map(|section| section.port).unwrap_or(587),
            smtp_user: email
                .as_ref()
                .map(|section| section.user.clone())
                .filter(|value| !value.trim().is_empty()),
            smtp_password: email
                .as_ref()
                .map(|section| section.password.clone())
                .filter(|value| !value.trim().is_empty()),
            smtp_from_name: auth.smtp_from_name.unwrap_or_else(|| "Minato".to_string()),
            fcaptcha_enabled: auth.fcaptcha_enabled.unwrap_or_else(|| {
                auth.fcaptcha_server_url
                    .as_ref()
                    .is_some_and(|value| !value.trim().is_empty())
                    && auth
                        .fcaptcha_site_key
                        .as_ref()
                        .is_some_and(|value| !value.trim().is_empty())
                    && auth
                        .fcaptcha_secret
                        .as_ref()
                        .is_some_and(|value| !value.trim().is_empty())
            }),
            fcaptcha_site_key: non_empty(auth.fcaptcha_site_key),
            fcaptcha_secret: non_empty(auth.fcaptcha_secret),
            fcaptcha_max_score: auth.fcaptcha_max_score.unwrap_or(0.5),
            fcaptcha_verify_ip_hash: auth.fcaptcha_verify_ip_hash.unwrap_or(false),
            afdian_client_id: afdian
                .as_ref()
                .and_then(|section| non_empty(section.client_id.clone())),
            afdian_client_secret: afdian
                .as_ref()
                .and_then(|section| non_empty(section.client_secret.clone())),
            afdian_redirect_uri: afdian.and_then(|section| non_empty(section.redirect_uri)),
            config_path,
        })
    }
}

pub fn cors_layer(config: &AppConfig) -> Result<CorsLayer> {
    let origins = config
        .allowed_cors_origins
        .iter()
        .map(|origin| origin.parse::<HeaderValue>())
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(true))
}

fn resolve_config_path() -> Result<PathBuf> {
    let candidates = [
        env::var("CONFIG_PATH").ok().map(PathBuf::from),
        Some(PathBuf::from("../../config.toml")),
        Some(PathBuf::from("config.toml")),
        Some(PathBuf::from("/app/config.toml")),
    ];

    candidates
        .into_iter()
        .flatten()
        .find(|path| path.exists())
        .map(normalize_path)
        .transpose()?
        .context("找不到 config.toml，请设置 CONFIG_PATH 或在仓库根目录提供 config.toml")
}

fn normalize_path(path: PathBuf) -> Result<PathBuf> {
    if path.is_absolute() {
        return Ok(path);
    }
    Ok(env::current_dir()?.join(path))
}

fn mongodb_uri(config: Option<MongodbSection>) -> String {
    let Some(config) = config else {
        return "mongodb://127.0.0.1:27017/?directConnection=true".to_string();
    };
    let direct_connection = config.direct_connection.unwrap_or(true);
    let credential = match (non_empty(config.user), non_empty(config.password)) {
        (Some(user), Some(password)) => format!("{user}:{password}@"),
        _ => String::new(),
    };
    format!(
        "mongodb://{}{}:{}/?directConnection={}",
        credential, config.host, config.port, direct_connection
    )
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.filter(|item| !item.trim().is_empty())
}

fn trim_trailing_slash(value: &str) -> String {
    value.trim_end_matches('/').to_string()
}

fn origin_from_base_url(value: &str) -> String {
    let Some((scheme, rest)) = value.split_once("://") else {
        return value.to_string();
    };
    let host = rest.split('/').next().unwrap_or(rest);
    format!("{scheme}://{host}")
}

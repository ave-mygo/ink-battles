use chrono::{DateTime, Utc};
use mongodb::bson::{DateTime as BsonDateTime, Document};
use regex::Regex;

use crate::{config::AppConfig, models::SafeUser};

pub fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

pub fn normalize_code_type(value: Option<&str>) -> &'static str {
    match value {
        Some("login") => "login",
        Some("reset-password") => "reset-password",
        _ => "register",
    }
}

pub fn is_valid_email(email: &str) -> bool {
    Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
        .map(|regex| regex.is_match(email))
        .unwrap_or(false)
}

pub fn is_password_valid(password: &str) -> bool {
    if password.len() < 10 {
        return false;
    }
    let checks = [
        password.chars().any(|value| value.is_ascii_lowercase()),
        password.chars().any(|value| value.is_ascii_uppercase()),
        password.chars().any(|value| value.is_ascii_digit()),
        password.chars().any(|value| !value.is_ascii_alphanumeric()),
    ];
    checks.iter().filter(|matched| **matched).count() >= 3
}

pub fn sanitize_return_url(config: &AppConfig, return_to: Option<String>) -> String {
    let Some(return_to) = return_to else {
        return config.default_return_url.clone();
    };
    if config
        .allowed_return_origins
        .iter()
        .any(|origin| return_to.starts_with(origin))
    {
        return_to
    } else {
        config.default_return_url.clone()
    }
}

pub fn bson_datetime_to_rfc3339(value: Option<&BsonDateTime>) -> String {
    value
        .map(|date_time| {
            DateTime::<Utc>::from_timestamp_millis(date_time.timestamp_millis())
                .unwrap_or_else(Utc::now)
                .to_rfc3339()
        })
        .unwrap_or_else(|| Utc::now().to_rfc3339())
}

pub fn url_encode(value: &str) -> String {
    value.bytes().fold(String::new(), |mut output, byte| {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                output.push(byte as char)
            }
            _ => output.push_str(&format!("%{:02X}", byte)),
        }
        output
    })
}

pub fn read_uid(user: &Document) -> i64 {
    user.get_i64("uid")
        .or_else(|_| user.get_i32("uid").map(i64::from))
        .unwrap_or_default()
}

pub fn safe_user(user: &Document) -> SafeUser {
    let uid = read_uid(user);
    SafeUser {
        uid,
        email: user.get_str("email").ok().map(ToOwned::to_owned),
        login_method: user.get_str("loginMethod").ok().map(ToOwned::to_owned),
        current_login_method: None,
        is_active: user.get_bool("isActive").unwrap_or(true),
        nickname: user.get_str("nickname").ok().map(ToOwned::to_owned),
        bio: user.get_str("bio").ok().map(ToOwned::to_owned),
        avatar: user
            .get_str("avatar")
            .ok()
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| format!("https://api.dicebear.com/7.x/avataaars/svg?seed={uid}")),
        is_admin: false,
        is_honorary_writer: false,
        can_review_excellent_sentences: false,
    }
}

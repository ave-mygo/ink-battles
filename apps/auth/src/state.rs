use std::sync::Arc;

use anyhow::Result;
use mongodb::{
    Collection, Database,
    bson::{Document, doc},
};

use crate::{config::AppConfig, password_crypto::PasswordCrypto};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub database: Database,
    pub users: Collection<Document>,
    pub auth_sessions: Collection<Document>,
    pub email_codes: Collection<Document>,
    pub oauth_states: Collection<Document>,
    pub reset_sessions: Collection<Document>,
    pub user_billing: Collection<Document>,
    pub password_crypto: PasswordCrypto,
}

impl AppState {
    pub fn new(config: Arc<AppConfig>, database: Database) -> Result<Self> {
        let password_crypto = PasswordCrypto::new()?;
        Ok(Self {
            config,
            users: database.collection("users"),
            auth_sessions: database.collection("auth_sessions"),
            email_codes: database.collection("email_verification_codes"),
            oauth_states: database.collection("oauth_states"),
            reset_sessions: database.collection("sessions"),
            user_billing: database.collection("user_billing"),
            password_crypto,
            database,
        })
    }
}

pub async fn ensure_indexes(state: &AppState) -> Result<()> {
    let _ = state
        .database
        .run_command(doc! {
            "createIndexes": "users",
            "indexes": [
                { "key": { "uid": 1 }, "name": "uniq_users_uid", "unique": true },
                { "key": { "email": 1 }, "name": "uniq_users_email", "unique": true, "sparse": true },
                { "key": { "qqOpenid": 1 }, "name": "uniq_users_qq_openid", "unique": true, "sparse": true },
                { "key": { "afdId": 1 }, "name": "uniq_users_afd_id", "unique": true, "sparse": true }
            ]
        })
        .await;
    let _ = state
        .database
        .run_command(doc! {
            "createIndexes": "auth_sessions",
            "indexes": [
                { "key": { "sessionId": 1 }, "name": "uniq_auth_sessions_sessionId", "unique": true },
                { "key": { "expiresAt": 1 }, "name": "ttl_auth_sessions_expiresAt", "expireAfterSeconds": 0 }
            ]
        })
        .await;
    let _ = state
        .database
        .run_command(doc! {
            "createIndexes": "oauth_states",
            "indexes": [
                { "key": { "state": 1 }, "name": "uniq_oauth_states_state", "unique": true },
                { "key": { "expiresAt": 1 }, "name": "ttl_oauth_states_expiresAt", "expireAfterSeconds": 0 }
            ]
        })
        .await;
    Ok(())
}

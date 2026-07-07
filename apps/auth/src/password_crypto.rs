use anyhow::{Context, Result, anyhow};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use rand08::rngs::OsRng;
use rsa::{
    Oaep, RsaPrivateKey, RsaPublicKey,
    pkcs8::{EncodePublicKey, LineEnding},
};
use serde::Serialize;
use sha2::{Digest, Sha256};

#[derive(Clone)]
pub struct PasswordCrypto {
    private_key: RsaPrivateKey,
    public_key_pem: String,
    key_id: String,
}

#[derive(Serialize)]
pub struct PasswordKeyResponse {
    #[serde(rename = "keyId")]
    pub key_id: String,
    #[serde(rename = "publicKey")]
    pub public_key: String,
    pub algorithm: &'static str,
}

impl PasswordCrypto {
    pub fn new() -> Result<Self> {
        let mut rng = OsRng;
        let private_key = RsaPrivateKey::new(&mut rng, 4096).context("生成密码加密私钥失败")?;
        let public_key = RsaPublicKey::from(&private_key);
        let public_key_pem = public_key
            .to_public_key_pem(LineEnding::LF)
            .context("导出密码加密公钥失败")?;
        let key_id = key_id_from_public_key(&public_key_pem);

        Ok(Self {
            private_key,
            public_key_pem,
            key_id,
        })
    }

    pub fn public_key_response(&self) -> PasswordKeyResponse {
        PasswordKeyResponse {
            key_id: self.key_id.clone(),
            public_key: self.public_key_pem.clone(),
            algorithm: "RSA-OAEP-256",
        }
    }

    pub fn decrypt(&self, ciphertext: &str, key_id: Option<&str>) -> Result<String> {
        let Some(key_id) = key_id else {
            return Err(anyhow!("缺少密码加密密钥标识"));
        };
        if key_id != self.key_id {
            return Err(anyhow!("密码加密密钥已轮换，请刷新页面后重试"));
        }

        let encrypted = STANDARD.decode(ciphertext).context("密码密文格式无效")?;
        let decrypted = self
            .private_key
            .decrypt(Oaep::new::<Sha256>(), &encrypted)
            .context("密码解密失败，请刷新页面后重试")?;

        String::from_utf8(decrypted).context("密码明文编码无效")
    }
}

pub fn resolve_password(
    crypto: &PasswordCrypto,
    plaintext: Option<&str>,
    ciphertext: Option<&str>,
    key_id: Option<&str>,
) -> Result<String> {
    if plaintext.is_some() {
        return Err(anyhow!("密码必须加密后提交，请刷新页面后重试"));
    }
    let Some(ciphertext) = ciphertext else {
        return Err(anyhow!("缺少加密密码，请刷新页面后重试"));
    };

    crypto.decrypt(ciphertext, key_id)
}

fn key_id_from_public_key(public_key_pem: &str) -> String {
    let digest = Sha256::digest(public_key_pem.as_bytes());
    hex::encode(&digest[..8])
}

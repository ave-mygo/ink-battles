use anyhow::{Context, Result};
use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor, message::Mailbox,
    transport::smtp::authentication::Credentials,
};

use crate::config::AppConfig;

pub async fn send_verification_email(
    config: &AppConfig,
    email: &str,
    code: &str,
    code_type: &str,
) -> Result<()> {
    let Some(host) = &config.smtp_host else {
        tracing::warn!("email.host 未配置，开发模式下验证码为 {}", code);
        return Ok(());
    };
    let Some(user) = &config.smtp_user else {
        tracing::warn!("email.user 未配置，开发模式下验证码为 {}", code);
        return Ok(());
    };
    let Some(password) = &config.smtp_password else {
        tracing::warn!("email.password 未配置，开发模式下验证码为 {}", code);
        return Ok(());
    };

    let subject = format!(
        "{}{}验证码",
        config.smtp_from_name,
        code_type_label(code_type)
    );
    let body = format!(
        "您的验证码是：{}\n\n该验证码将在 5 分钟后失效。如非本人操作，请忽略本邮件。",
        code
    );
    let from: Mailbox = format!("{} <{}>", config.smtp_from_name, user)
        .parse()
        .context("email.user 不是有效邮箱地址")?;
    let to: Mailbox = email.parse().context("收件人邮箱地址无效")?;
    let message = Message::builder()
        .from(from)
        .to(to)
        .subject(subject)
        .body(body)?;

    let credentials = Credentials::new(user.clone(), password.clone());
    let mailer = AsyncSmtpTransport::<Tokio1Executor>::relay(host)?
        .port(config.smtp_port)
        .credentials(credentials)
        .build();

    mailer.send(message).await?;
    Ok(())
}

fn code_type_label(code_type: &str) -> &'static str {
    match code_type {
        "reset-password" => "重置密码",
        "login" => "登录",
        _ => "注册",
    }
}

use anyhow::{Context, Result};
use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    message::{Mailbox, MultiPart, SinglePart, header::ContentType},
    transport::smtp::authentication::Credentials,
};

use crate::{EMAIL_CODE_TTL_MINUTES, config::AppConfig};

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

    let code_type_label = code_type_label(code_type);
    let subject = format!("{} - {}验证码", config.smtp_from_name, code_type_label);
    let body = verification_email_text(code, code_type_label);
    let html = verification_email_html(config, code, code_type_label);
    let from: Mailbox = format!("{} <{}>", config.smtp_from_name, user)
        .parse()
        .context("email.user 不是有效邮箱地址")?;
    let to: Mailbox = email.parse().context("收件人邮箱地址无效")?;
    let message = Message::builder()
        .from(from)
        .to(to)
        .subject(subject)
        .multipart(
            MultiPart::alternative()
                .singlepart(SinglePart::plain(body))
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_HTML)
                        .body(html),
                ),
        )?;

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

fn verification_email_text(code: &str, code_type_label: &str) -> String {
    format!(
        "您好，\n\n感谢您使用 Minato。您正在尝试进行{code_type_label}操作，请使用下方的六位数字验证码完成身份验证。\n\n验证码：{code}\n\n该验证码将在 {EMAIL_CODE_TTL_MINUTES} 分钟后失效。如非本人操作，请忽略本邮件并确保您的密码安全。\n\n此邮件由安全系统自动发送，请勿直接回复。\n© 2026 Minato Studio. All rights reserved."
    )
}

fn verification_email_html(config: &AppConfig, code: &str, code_type_label: &str) -> String {
    let brand_name = escape_html(&config.smtp_from_name);
    let code = escape_html(code);
    let code_type_label = escape_html(code_type_label);

    format!(
        r#"<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{brand_name} - 邮件验证码</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #18181b;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }}
    table {{
      border-collapse: collapse;
      width: 100%;
    }}
    .wrapper {{
      padding: 40px 20px;
      background-color: #fafafa;
      width: 100%;
      box-sizing: border-box;
    }}
    .main-container {{
      max-width: 480px;
      width: 100%;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
      overflow: hidden;
    }}
    .header-glow {{
      height: 4px;
      width: 100%;
      background: linear-gradient(90deg, #e4e4e7, #18181b, #e4e4e7);
      opacity: 0.8;
    }}
    .content-box {{
      padding: 48px 40px;
    }}
    .brand {{
      margin-bottom: 40px;
    }}
    .brand-en {{
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.15em;
      color: #18181b;
      margin-right: 8px;
    }}
    .brand-cn {{
      font-size: 11px;
      color: #18181b;
      opacity: 0.8;
    }}
    .title {{
      font-size: 18px;
      font-weight: 400;
      letter-spacing: -0.02em;
      margin: 0 0 16px 0;
      color: #18181b;
    }}
    .message {{
      font-size: 13px;
      color: #52525b;
      margin: 0 0 32px 0;
      line-height: 1.7;
    }}
    .code-wrapper {{
      background-color: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 4px;
      padding: 24px;
      text-align: center;
      margin-bottom: 32px;
    }}
    .code-label {{
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #71717a;
      margin-bottom: 12px;
      display: block;
    }}
    .code-number {{
      font-family: "JetBrains Mono", SFMono-Regular, Consolas, Menlo, monospace;
      font-size: 36px;
      font-weight: 400;
      letter-spacing: 0.25em;
      color: #18181b;
      margin: 0;
      line-height: 1;
    }}
    .disclaimer {{
      font-size: 12px;
      color: #71717a;
      margin: 0 0 32px 0;
      line-height: 1.6;
    }}
    .divider {{
      height: 1px;
      background-color: #f4f4f5;
      margin: 0 0 24px 0;
      width: 100%;
    }}
    .footer {{
      text-align: center;
    }}
    .footer-text {{
      font-size: 11px;
      color: #a1a1aa;
      margin: 0 0 8px 0;
    }}
    @media (prefers-color-scheme: dark) {{
      body, .wrapper {{
        background-color: #0a0a0b;
      }}
      .main-container {{
        background-color: #121214;
        border-color: #27272a;
      }}
      .header-glow {{
        background: linear-gradient(90deg, #27272a, #f4f4f5, #27272a);
      }}
      .brand-en, .brand-cn, .title, .code-number {{
        color: #f4f4f5;
      }}
      .message {{
        color: #a1a1aa;
      }}
      .code-wrapper {{
        background-color: #18181b;
        border-color: #27272a;
      }}
      .code-label, .disclaimer, .footer-text {{
        color: #71717a;
      }}
      .divider {{
        background-color: #27272a;
      }}
    }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-container">
      <div class="header-glow"></div>
      <div class="content-box">
        <div class="brand">
          <span class="brand-en">MINATO</span>
          <span class="brand-cn">凑</span>
        </div>
        <h1 class="title">身份验证</h1>
        <p class="message">
          您好，<br><br>
          感谢您使用 {brand_name}。您正在尝试进行{code_type_label}操作，请使用下方的六位数字验证码完成身份验证。该验证码将在 <strong>{EMAIL_CODE_TTL_MINUTES} 分钟</strong> 后失效。
        </p>
        <div class="code-wrapper">
          <span class="code-label">您的验证码 / SECURITY CODE</span>
          <p class="code-number">{code}</p>
        </div>
        <p class="disclaimer">
          如果您未曾请求此验证码，这可能意味着有人尝试访问您的账户。请忽略此邮件并确保您的密码安全。
        </p>
        <div class="divider"></div>
        <div class="footer">
          <p class="footer-text">此邮件由安全系统自动发送，请勿直接回复。</p>
          <p class="footer-text">© 2026 Minato Studio. All rights reserved.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>"#
    )
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

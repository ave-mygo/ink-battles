import nodemailer from "nodemailer";
import { getConfig } from "@/config";

// 从全局配置解构所需配置项（按照指定写法）
const {
	email: {
		host: EMAIL_HOST,
		port: EMAIL_PORT,
		user: EMAIL_USER,
		password: EMAIL_PASSWORD,
	},
	app: {
		app_name: NEXT_PUBLIC_APP_NAME,
	},
} = getConfig();

/**
 * 邮件服务配置
 */
interface EmailConfig {
	host: string;
	port: number;
	secure: boolean;
	auth?: {
		user: string;
		pass: string;
	};
	starttls?: {
		enable: boolean;
	};
}

/**
 * 邮件发送选项
 */
interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	text?: string;
	from?: string;
	headers?: Record<string, string>;
}

/**
 * 邮件发送结果
 */
interface EmailResult {
	success: boolean;
	message: string;
	error?: string;
}

/**
 * 获取SMTP配置
 */
export const getSmtpConfig = (): EmailConfig => ({
	host: EMAIL_HOST || "",
	port: Number(EMAIL_PORT || 587),
	secure: Number(EMAIL_PORT) === 465,
	starttls: {
		enable: Number(EMAIL_PORT) === 587,
	},
	auth: EMAIL_USER && EMAIL_PASSWORD
		? {
				user: EMAIL_USER,
				pass: EMAIL_PASSWORD,
			}
		: undefined,
});

/**
 * 获取发件人地址
 */
export const getFromAddress = (): string => {
	const address = EMAIL_USER || "noreply@localhost";
	const name = "Rikki|狸希";
	return name ? `${name} <${address}>` : address;
};

/**
 * 创建SMTP传输器
 */
export const createTransporter = () => {
	const config = getSmtpConfig();
	return nodemailer.createTransport(config);
};

/**
 * 发送邮件
 */
export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
	try {
		const transporter = createTransporter();
		const fromAddress = options.from || getFromAddress();

		await transporter.sendMail({
			from: fromAddress,
			to: options.to,
			subject: options.subject,
			html: options.html,
			text: options.text,
			headers: options.headers,
		});

		return { success: true, message: "邮件发送成功" };
	} catch (error) {
		console.error("发送邮件失败:", error);
		return {
			success: false,
			message: "邮件发送失败",
			error: error instanceof Error ? error.message : String(error),
		};
	}
};

/**
 * 发送验证码邮件
 */
export const sendVerificationEmail = async (
	email: string,
	code: string,
	type: "register" | "login" = "register",
): Promise<EmailResult> => {
	const brand = NEXT_PUBLIC_APP_NAME || "Rikki|狸希";
	const actionText = type === "register" ? "账户注册" : "账户登录";
	const subject = `欢迎使用 作家战力分析系统 Ink Battles | ${brand}`;

	// 反垃圾邮件优化的HTML模板
	const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${subject}</title>
	<style>
		body {
			margin: 0;
			padding: 20px;
			font-family: Arial, "Microsoft YaHei", sans-serif;
			background-color: #f5f5f5;
			color: #333333;
		}
		.email-container {
			max-width: 600px;
			margin: 0 auto;
			background-color: #ffffff;
			border-radius: 8px;
			overflow: hidden;
			border: 1px solid #dddddd;
		}
		.header {
			background-color: #4a90e2;
			color: #ffffff;
			padding: 30px 20px;
			text-align: center;
		}
		.header h1 {
			margin: 0;
			font-size: 24px;
			font-weight: normal;
		}
		.content {
			padding: 30px 20px;
		}
		.greeting {
			font-size: 16px;
			margin-bottom: 20px;
		}
		.verification-section {
			background-color: #f8f9fa;
			border: 1px solid #e9ecef;
			border-radius: 6px;
			padding: 20px;
			text-align: center;
			margin: 20px 0;
		}
		.verification-code {
			font-size: 32px;
			font-weight: bold;
			color: #4a90e2;
			letter-spacing: 4px;
			margin: 10px 0;
			font-family: monospace;
		}
		.notice {
			font-size: 14px;
			color: #666666;
			margin-top: 20px;
			line-height: 1.5;
		}
		.footer {
			background-color: #f8f9fa;
			padding: 20px;
			text-align: center;
			border-top: 1px solid #e9ecef;
			font-size: 12px;
			color: #888888;
		}
		@media only screen and (max-width: 600px) {
			.email-container {
				border-radius: 0;
				margin: 0;
			}
			.content {
				padding: 20px 15px;
			}
			.verification-code {
				font-size: 28px;
				letter-spacing: 2px;
			}
		}
	</style>
</head>
<body>
	<div class="email-container">
		<div class="header">
			<h1>${brand}</h1>
		</div>
		
		<div class="content">
			<div class="greeting">
				您好，
			</div>
			
			<p>您正在进行${actionText}操作，请使用以下验证码完成身份验证：</p>
			
			<div class="verification-section">
				<div>验证码</div>
				<div class="verification-code">${code}</div>
				<div style="font-size: 14px; color: #666;">有效期：10分钟</div>
			</div>
			
			<p>请在验证页面输入此验证码以完成操作。</p>
			
			<div class="notice">
				温馨提示：<br>
				• 此验证码仅用于本次${actionText}操作<br>
				• 如非本人操作，请忽略此邮件<br>
				• 请妥善保管验证码，勿泄露给他人
			</div>
		</div>
		
		<div class="footer">
			<p>此邮件由系统自动发送，请勿回复</p>
			<p>&copy; ${new Date().getFullYear()} ${brand} 版权所有</p>
		</div>
	</div>
</body>
</html>`;
	// 优化邮件头，避免被识别为垃圾邮件
	const headers = {
		"X-Mailer": "Nodemailer",
		"X-Auto-Response-Suppress": "OOF, DR, RN, NRN, AutoReply",
		"Precedence": "list",
		"Content-Type": "text/html; charset=UTF-8",
	};

	return sendEmail({
		from: getFromAddress(),
		to: email,
		subject,
		html,
		headers,
	});
};

/**
 * 验证SMTP配置是否有效
 */
export const verifySmtpConfig = async (): Promise<boolean> => {
	try {
		const transporter = createTransporter();
		await transporter.verify();
		return true;
	} catch (error) {
		console.error("SMTP配置验证失败:", error);
		return false;
	}
};

/**
 * 发送测试邮件
 */
export const sendTestEmail = async (email: string): Promise<EmailResult> => {
	const brand = NEXT_PUBLIC_APP_NAME || "Ink Battles";
	const subject = `${brand} 邮件服务测试`;

	const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
		<h2 style="color: #4a90e2; margin-bottom: 20px;">${brand} 邮件服务测试</h2>
		<p>您好，</p>
		<p>这是一封测试邮件，用于验证邮件服务是否正常工作。</p>
		<p>如果您收到此邮件，说明邮件服务配置成功。</p>
		<p style="margin-top: 30px; font-size: 14px; color: #666;">
			发送时间：${new Date().toLocaleString("zh-CN")}<br>
			© ${new Date().getFullYear()} ${brand}
		</p>
	</div>
</body>
</html>`;

	return sendEmail({
		to: email,
		subject,
		html,
	});
};

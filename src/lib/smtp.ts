import process from "node:process";
import nodemailer from "nodemailer";

/**
 * 邮件服务配置
 */
interface EmailConfig {
	host: string;
	port: number;
	secure: boolean;
	starttls?: {
		enable: boolean;
		success?: boolean;
	};
	auth?: {
		user: string;
		pass: string;
	};
}

/**
 * 邮件发送选项
 */
interface EmailOptions {
	to: string;
	subject: string;
	html: string;
	from?: string;
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
 * STARTTLS配置：port 587, secure: false, starttls.enable: true
 */
export const getSmtpConfig = (): EmailConfig => ({
	host: process.env.EMAIL_HOST || "",
	port: Number(process.env.EMAIL_PORT || 587),
	secure: false, // 明文连接，然后尝试升级
	starttls: {
		enable: true, // 尝试 STARTTLS
		success: false, // 升级失败也继续连接
	},
	auth: process.env.EMAIL_USER && process.env.EMAIL_PASS
		? {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			}
		: undefined,
});

/**
 * 获取发件人地址
 */
export const getFromAddress = (): string => {
	return process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@localhost";
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
	const subject = "您的验证码（10分钟内有效）";
	const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; line-height: 1.6;">
    <h2>验证码</h2>
    <p>您正在进行${type === "register" ? "注册" : "登录"}验证，验证码如下：</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
    <p>10 分钟内有效，请勿泄露给他人。</p>
  </div>`;

	return sendEmail({ to: email, subject, html });
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

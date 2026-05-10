import nodemailer from "nodemailer";
import { getConfig } from "../config";

type VerificationType = "register" | "login" | "reset-password";

const typeLabels: Record<VerificationType, string> = {
	"register": "注册",
	"login": "登录",
	"reset-password": "重置密码",
};

/**
 * 发送验证码邮件
 * @param email - 收件人邮箱地址
 * @param code - 验证码
 * @param type - 验证类型（注册/登录/重置密码）
 * @returns 发送结果，包含成功状态和提示信息
 */
export const sendVerificationEmail = async (email: string, code: string, type: VerificationType) => {
	const config = getConfig();
	const transporter = nodemailer.createTransport({
		host: config.email.host,
		port: config.email.port,
		secure: config.email.port === 465,
		auth: {
			user: config.email.user,
			pass: config.email.password,
		},
	});

	await transporter.sendMail({
		from: `"${config.app.app_name}" <${config.email.user}>`,
		to: email,
		subject: `${config.app.app_name}${typeLabels[type]}验证码`,
		text: `您的验证码是 ${code}，10 分钟内有效。`,
	});

	return { success: true, message: "验证码已发送" };
};

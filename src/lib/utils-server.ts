"use server";

import process from "node:process";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { db_find, db_insert, db_read, db_update } from "@/lib/db";
import "server-only";

const DB_NAME = "ink_battles";

export const db_insert_session = async (): Promise<string> => {
	const session = Math.random().toString(36).substring(2, 36) + Math.random().toString(36).substring(2, 36);
	await db_insert(DB_NAME, "sessions", { session });
	return session;
};

export async function getScorePercentile(currentScore: number) {
	try {
		const scores = await db_read(DB_NAME, "analysis_requests", {}, { sort: { overallScore: -1 } });
		const totalScores = scores.length;
		if (totalScores === 0)
			return null;

		const higherScores = scores.filter(s => s.overallScore <= currentScore).length;
		const percentile = ((higherScores / totalScores) * 100).toFixed(1);
		return percentile;
	} catch (error) {
		console.error("Error calculating percentile:", error);
		return null;
	}
}
export async function verifyTokenSSR(token: string): Promise<boolean> {
	try {
		const found = await db_find(DB_NAME, "apikeys", { token });
		if (found) {
			if (!found.used) {
				await db_update(DB_NAME, "apikeys", { token }, { used: true });
			}
			return true;
		}
		return false;
	} catch (error) {
		console.error("Error verifying token:", error);
		return false;
	}
}

/**
 * 用户注册
 * @param email 邮箱
 * @param password 密码
 * @returns { success, message } 注册结果对象，包含是否成功和提示信息
 */
export async function registerUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
	if (!email || !password) {
		return { success: false, message: "邮箱和密码不能为空" };
	}
	// 检查邮箱是否已注册
	const existing = await db_find(DB_NAME, "users", { email });
	if (existing) {
		return { success: false, message: "该邮箱已注册" };
	}
	// 密码加密
	const passwordHash = await bcrypt.hash(password, 10);
	const createdAt = new Date();
	const ok = await db_insert(DB_NAME, "users", { email, passwordHash, createdAt });
	if (!ok) {
		return { success: false, message: "注册失败，请重试" };
	}
	return { success: true, message: "注册成功，请登录" };
}

/**
 * 用户登录
 * @param email 邮箱
 * @param password 密码
 * @returns { success, message } 登录结果对象，包含是否成功和提示信息
 */
export async function LoginUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
	if (!email || !password) {
		return { success: false, message: "邮箱和密码不能为空" };
	}
	const user = await db_find(DB_NAME, "users", { email });
	if (!user) {
		return { success: false, message: "用户不存在" };
	}
	const match = await bcrypt.compare(password, user.passwordHash);
	if (!match) {
		return { success: false, message: "密码错误" };
	}
	// 生成 token（如无 JWT，先用 uuid）
	const token = uuidv4();
	const cookieStore = await cookies();
	cookieStore.set("auth-token", token, {
		httpOnly: true,
		sameSite: "lax",
		maxAge: 24 * 60 * 60 * 7,
	});
	return { success: true, message: "登录成功" };
}

// ===== 新增：邮箱验证码发送与校验 =====

type VerificationType = "register" | "login";

/**
 * 发送邮箱验证码（SMTP）
 * @param email 邮箱地址
 * @param type 验证类型：register/login
 * @returns { success, message }
 */
/**
 * @returns 返回是否发送成功与消息
 */
export const SendVerificationEmail = async (
	email: string,
	type: VerificationType = "register",
): Promise<{ success: boolean; message: string }> => {
	if (!email) {
		return { success: false, message: "邮箱不能为空" };
	}

	const code = Math.floor(100000 + Math.random() * 900000).toString();
	const codeHash = await bcrypt.hash(code, 10);
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);

	// 持久化验证码（同邮箱同类型，仅保留一条有效未使用的记录）
	const existed = await db_find(DB_NAME, "email_verification_codes", { email, type, used: false });
	if (existed) {
		await db_update(DB_NAME, "email_verification_codes", { _id: existed._id }, { codeHash, createdAt, expiresAt });
	} else {
		await db_insert(DB_NAME, "email_verification_codes", { email, type, codeHash, createdAt, expiresAt, used: false });
	}

	// SMTP 发送
	const transport = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT || 587),
		secure: Boolean(process.env.SMTP_SECURE === "true"),
		auth: process.env.SMTP_USER && process.env.SMTP_PASS
			? {
					user: process.env.SMTP_USER,
					pass: process.env.SMTP_PASS,
				}
			: undefined,
	});

	const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";

	try {
		await transport.sendMail({
			from: fromAddress,
			to: email,
			subject: "您的验证码（10分钟内有效）",
			html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; line-height: 1.6;">
        <h2>验证码</h2>
        <p>您正在进行${type === "register" ? "注册" : "登录"}验证，验证码如下：</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>10 分钟内有效，请勿泄露给他人。</p>
      </div>`,
		});
		return { success: true, message: "验证码已发送" };
	} catch (error) {
		console.error("发送邮件失败:", error);
		return { success: false, message: "发送邮件失败，请稍后重试" };
	}
};

/**
 * 校验邮箱验证码
 * @param email 邮箱
 * @param code 验证码
 * @param type 验证类型
 * @returns { success, message }
 */
/**
 * @returns 返回是否验证通过与消息
 */
export const VerifyEmailCode = async (
	email: string,
	code: string,
	type: VerificationType = "register",
): Promise<{ success: boolean; message: string }> => {
	if (!email || !code) {
		return { success: false, message: "邮箱和验证码不能为空" };
	}

	const record = await db_find(DB_NAME, "email_verification_codes", { email, type, used: false });
	if (!record) {
		return { success: false, message: "验证码不存在，请重新发送" };
	}
	if (new Date(record.expiresAt).getTime() < Date.now()) {
		return { success: false, message: "验证码已过期，请重新发送" };
	}
	const ok = await bcrypt.compare(code, record.codeHash);
	if (!ok) {
		return { success: false, message: "验证码错误" };
	}
	await db_update(DB_NAME, "email_verification_codes", { _id: record._id }, { used: true, usedAt: new Date() });
	return { success: true, message: "验证码校验通过" };
};

/**
 * 新注册流程：需验证码
 */
export const RegisterUser = async (
	email: string,
	password: string,
	code: string,
): Promise<{ success: boolean; message: string }> => {
	if (!email || !password || !code) {
		return { success: false, message: "邮箱、密码和验证码不能为空" };
	}
	const existing = await db_find(DB_NAME, "users", { email });
	if (existing) {
		return { success: false, message: "该邮箱已注册" };
	}

	const verify = await VerifyEmailCode(email, code, "register");
	if (!verify.success) {
		return verify;
	}

	const passwordHash = await bcrypt.hash(password, 10);
	const createdAt = new Date();
	const ok = await db_insert(DB_NAME, "users", { email, passwordHash, createdAt });
	if (!ok) {
		return { success: false, message: "注册失败，请重试" };
	}
	return { success: true, message: "注册成功，请登录" };
};


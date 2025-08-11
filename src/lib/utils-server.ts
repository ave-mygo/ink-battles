"use server";

import process from "node:process";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { DAILY_CAP_GUEST, PER_REQUEST_GUEST, PER_REQUEST_LOGGED } from "@/lib/constants";
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
	// 使用 JWT 签发登录令牌
	const secret = process.env.JWT_SECRET || "dev_secret_change_me";
	const token = jwt.sign({ email }, secret, { expiresIn: "7d" });
	const cookieStore = await cookies();
	cookieStore.set("auth-token", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
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

	// 使用 SMTP 库发送邮件
	const { sendVerificationEmail } = await import("./smtp");
	const result = await sendVerificationEmail(email, code, type);
	
	return result;
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
	// 验证密码强度
	const { isPasswordValid } = await import("./password-strength");
	if (!isPasswordValid(password)) {
		return { success: false, message: "密码不符合要求。密码必须：至少8位字符、包含小写字母、数字和特殊字符" };
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

/**
 * 获取当前登录用户邮箱（基于 Cookie `auth-token`）
 */
export const getCurrentUserEmail = async (): Promise<string | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;
	try {
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		return payload.email ?? null;
	} catch {
		return null;
	}
};

/**
 * 校验并消耗使用额度。
 * - 未登录：单次最大 5000 字，且当日累计（按 IP 或 指纹 任一标识）≤ 100000
 * - 已登录：单次最大 60000 字，无当日累计上限
 * @returns 是否允许本次请求与提示信息
 */
export const checkAndConsumeUsage = async (
	params: {
		userEmail: string | null;
		ip?: string | null;
		fingerprint?: string | null;
		textLength: number;
	},
): Promise<{ allowed: boolean; message?: string }> => {
	const { userEmail, ip, fingerprint, textLength } = params;
	const isLoggedIn = Boolean(userEmail);

	if (isLoggedIn) {
		if (textLength > PER_REQUEST_LOGGED) {
			return { allowed: false, message: `单次分析上限为 ${PER_REQUEST_LOGGED} 字` };
		}
		// 登录用户无日上限，不记录日计数，但可按需统计
		return { allowed: true };
	}

	// 未登录：单次限制
	if (textLength > PER_REQUEST_GUEST) {
		return { allowed: false, message: `未登录单次分析上限为 ${PER_REQUEST_GUEST} 字` };
	}

	// 未登录：日累计限制（按任一：IP 或 指纹）
	const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
	const ipKey = ip ? { dayKey, type: "ip", key: ip } : null;
	const fpKey = fingerprint ? { dayKey, type: "fp", key: fingerprint } : null;

	const readCounter = async (key: { dayKey: string; type: string; key: string } | null): Promise<number> => {
		if (!key)
			return 0;
		const doc = await db_find(DB_NAME, "daily_usage", key);
		return doc?.used ?? 0;
	};

	const ipUsed = await readCounter(ipKey);
	const fpUsed = await readCounter(fpKey);
	const existedMax = Math.max(ipUsed, fpUsed);

	if (existedMax + textLength > DAILY_CAP_GUEST) {
		return { allowed: false, message: `未登录当日累计上限为 ${DAILY_CAP_GUEST} 字，请登录后继续使用` };
	}

	const incCounter = async (key: { dayKey: string; type: string; key: string } | null, delta: number) => {
		if (!key)
			return;
		const doc = await db_find(DB_NAME, "daily_usage", key);
		if (doc) {
			await db_update(DB_NAME, "daily_usage", key, { used: (doc.used ?? 0) + delta, updatedAt: new Date() });
		} else {
			await db_insert(DB_NAME, "daily_usage", { ...key, used: delta, createdAt: new Date() });
		}
	};

	// 同步增加 IP 与 指纹计数，防止绕过
	await incCounter(ipKey, textLength);
	await incCounter(fpKey, textLength);

	return { allowed: true };
};

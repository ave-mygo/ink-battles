"use server";

import type { BaseUserInfo } from "@/types/auth/user";
import process from "node:process";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { calculateAdvancedModelCalls, db_name, getUserType, USER_LIMITS, UserType } from "@/lib/constants";
import { db_find, db_insert, db_read, db_update } from "@/lib/db";
import { getUserSubscriptionData } from "@/lib/subscription";

import "server-only";

export const db_insert_session = async (): Promise<string> => {
	const session = Math.random().toString(36).substring(2, 36) + Math.random().toString(36).substring(2, 36);
	await db_insert(db_name, "sessions", { session });
	return session;
};

export async function getScorePercentile(currentScore: number) {
	try {
		const scores = await db_read(db_name, "analysis_requests", {}, { sort: { overallScore: -1 } });
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
		const found = await db_find(db_name, "apikeys", { token });
		if (found) {
			if (!found.used) {
				await db_update(db_name, "apikeys", { token }, { used: true });
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
	const existing = await db_find(db_name, "users", { email });
	if (existing) {
		return { success: false, message: "该邮箱已注册" };
	}
	// 密码加密
	const passwordHash = await bcrypt.hash(password, 10);
	const createdAt = new Date();
	const ok = await db_insert(db_name, "users", { email, passwordHash, createdAt });
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
	const user = await db_find(db_name, "users", { email });
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
	const existed = await db_find(db_name, "email_verification_codes", { email, type, used: false });
	if (existed) {
		await db_update(db_name, "email_verification_codes", { _id: existed._id }, { codeHash, createdAt, expiresAt });
	} else {
		await db_insert(db_name, "email_verification_codes", { email, type, codeHash, createdAt, expiresAt, used: false });
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

	const record = await db_find(db_name, "email_verification_codes", { email, type, used: false });
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
	await db_update(db_name, "email_verification_codes", { _id: record._id }, { used: true, usedAt: new Date() });
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

	const existing = await db_find(db_name, "users", { email });
	if (existing) {
		return { success: false, message: "该邮箱已注册" };
	}

	const verify = await VerifyEmailCode(email, code, "register");
	if (!verify.success) {
		return verify;
	}

	const passwordHash = await bcrypt.hash(password, 10);
	const createdAt = new Date();
	const ok = await db_insert(db_name, "users", { email, passwordHash, createdAt });
	if (!ok) {
		return { success: false, message: "注册失败，请重试" };
	}
	return { success: true, message: "注册成功，请登录" };
};

/**
 * QQ登录：使用临时代码获取用户信息并创建/更新用户
 * @param tempCode 临时授权码
 * @returns 登录结果
 */
export const LoginWithQQ = async (tempCode: string): Promise<{ success: boolean; message: string; userInfo?: BaseUserInfo }> => {
	if (!tempCode) {
		return { success: false, message: "授权码不能为空" };
	}

	try {
		// 调用第三方API获取用户信息
		const response = await fetch(`https://api-space.tnxg.top/user/info?code=${tempCode}`);
		const data = await response.json();

		if (data.status !== "success") {
			return { success: false, message: data.message || "获取用户信息失败" };
		}

		const qqUserInfo = data.data;
		const { qq_openid, nickname, avatar } = qqUserInfo;

		if (!qq_openid) {
			return { success: false, message: "QQ用户信息不完整" };
		}

		// 查找是否已存在该QQ用户
		let user = await db_find(db_name, "users", { qqOpenid: qq_openid });
		const now = new Date();

		if (user) {
			// 更新已存在用户的信息
			await db_update(db_name, "users", { qqOpenid: qq_openid }, {
				nickname,
				avatar,
				updatedAt: now,
				isActive: true,
			});
			user = { ...user, nickname, avatar, updatedAt: now };
		} else {
			// 创建新用户
			const newUser: BaseUserInfo = {
				qqOpenid: qq_openid,
				nickname,
				avatar,
				loginMethod: "qq",
				createdAt: now,
				updatedAt: now,
				isActive: true,
			};

			const insertResult = await db_insert(db_name, "users", newUser);
			if (!insertResult) {
				return { success: false, message: "创建用户失败" };
			}
			user = newUser;
		}

		// 生成JWT令牌
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const tokenPayload = {
			qqOpenid: qq_openid,
			email: user.email || null,
			loginMethod: "qq",
		};
		const token = jwt.sign(tokenPayload, secret, { expiresIn: "7d" });

		// 设置Cookie
		const cookieStore = await cookies();
		cookieStore.set("auth-token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 24 * 60 * 60 * 7,
		});

		return {
			success: true,
			message: "QQ登录成功",
			userInfo: user,
		};
	} catch (error) {
		console.error("QQ登录错误:", error);
		return { success: false, message: "登录失败，请重试" };
	}
};

/**
 * 绑定QQ到现有邮箱账户
 * @param email 邮箱
 * @param tempCode QQ授权临时码
 */
export const BindQQToEmail = async (email: string, tempCode: string): Promise<{ success: boolean; message: string }> => {
	if (!email || !tempCode) {
		return { success: false, message: "邮箱和授权码不能为空" };
	}

	try {
		// 获取QQ用户信息
		const response = await fetch(`https://api-space.tnxg.top/user/info?code=${tempCode}`);
		const data = await response.json();

		if (data.status !== "success") {
			return { success: false, message: "获取QQ用户信息失败" };
		}

		const { qq_openid, nickname, avatar } = data.data;

		// 检查邮箱用户是否存在
		const emailUser = await db_find(db_name, "users", { email });
		if (!emailUser) {
			return { success: false, message: "邮箱用户不存在" };
		}

		// 检查QQ是否已绑定其他用户
		const qqUser = await db_find(db_name, "users", { qqOpenid: qq_openid });
		if (qqUser && qqUser._id.toString() !== emailUser._id.toString()) {
			return { success: false, message: "该QQ已绑定其他用户" };
		}

		// 绑定QQ信息到邮箱用户
		await db_update(db_name, "users", { email }, {
			qqOpenid: qq_openid,
			nickname: nickname || emailUser.nickname,
			avatar: avatar || emailUser.avatar,
			updatedAt: new Date(),
		});

		return { success: true, message: "QQ绑定成功" };
	} catch (error) {
		console.error("QQ绑定错误:", error);
		return { success: false, message: "绑定失败，请重试" };
	}
};

/**
 * 绑定邮箱到QQ账户
 * @param qqOpenid QQ OpenID
 * @param email 邮箱
 * @param password 密码
 */
export const BindEmailToQQ = async (qqOpenid: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
	if (!qqOpenid || !email || !password) {
		return { success: false, message: "QQ信息、邮箱和密码不能为空" };
	}

	try {
		// 检查邮箱是否已被其他用户使用
		const emailUser = await db_find(db_name, "users", { email });
		if (emailUser && emailUser.qqOpenid !== qqOpenid) {
			return { success: false, message: "该邮箱已被其他用户使用" };
		}

		// 验证密码强度
		const { isPasswordValid } = await import("./password-strength");
		if (!isPasswordValid(password)) {
			return { success: false, message: "密码不符合要求。密码必须：至少8位字符、包含小写字母、数字和特殊字符" };
		}

		// 查找QQ用户
		const qqUser = await db_find(db_name, "users", { qqOpenid });
		if (!qqUser) {
			return { success: false, message: "QQ用户不存在" };
		}

		// 加密密码
		const passwordHash = await bcrypt.hash(password, 10);

		// 绑定邮箱到QQ用户
		await db_update(db_name, "users", { qqOpenid }, {
			email,
			passwordHash,
			updatedAt: new Date(),
		});

		return { success: true, message: "邮箱绑定成功" };
	} catch (error) {
		console.error("邮箱绑定错误:", error);
		return { success: false, message: "绑定失败，请重试" };
	}
};
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
 * 获取当前登录用户的完整信息
 * @returns 用户信息或null
 */
export const getCurrentUserInfo = async (): Promise<BaseUserInfo | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;

	try {
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as {
			email?: string;
			qqOpenid?: string;
			loginMethod?: "email" | "qq";
		};

		let user: BaseUserInfo | null = null;

		if (payload.email) {
			user = await db_find(db_name, "users", { email: payload.email });
		} else if (payload.qqOpenid) {
			user = await db_find(db_name, "users", { qqOpenid: payload.qqOpenid });
		}

		return user;
	} catch {
		return null;
	}
};

/**
 * 校验并消耗使用额度 - 支持用户分级
 * - 游客（未登录）：按配置的单次和每日限制
 * - 普通用户（已登录但未捐赠）：按配置的单次限制，无日累计限制
 * - 会员用户（已登录且已捐赠）：无单次和日累计限制，可使用高级模型
 * @returns 是否允许本次请求、提示信息和用户信息
 */
export const checkAndConsumeUsage = async (
	params: {
		userEmail: string | null;
		ip?: string | null;
		fingerprint?: string | null;
		textLength: number;
		isAdvancedModel?: boolean; // 是否使用高级模型
	},
): Promise<{
	allowed: boolean;
	message?: string;
	userType?: UserType;
	dailyAdvancedModelCalls?: number;
	remainingAdvancedModelCalls?: number;
}> => {
	const { userEmail, ip, fingerprint, textLength, isAdvancedModel = false } = params;
	const isLoggedIn = Boolean(userEmail);

	let donationAmount = 0;
	let userType = getUserType(isLoggedIn, donationAmount);

	// 如果用户已登录，获取订阅信息
	if (isLoggedIn && userEmail) {
		try {
			const subscriptionData = await getUserSubscriptionData(userEmail);
			donationAmount = subscriptionData.subscription.totalAmount || 0;
			userType = getUserType(isLoggedIn, donationAmount);
		} catch (error) {
			console.warn("获取用户订阅信息失败，使用默认限制:", error);
		}
	}

	const limits = USER_LIMITS[userType];

	// 检查单次字数限制
	if (limits.perRequest && textLength > limits.perRequest) {
		return {
			allowed: false,
			message: `${userType === UserType.GUEST ? "游客" : userType === UserType.REGULAR ? "普通用户" : "会员"}单次分析上限为 ${limits.perRequest.toLocaleString()} 字`,
			userType,
		};
	}

	// 检查高级模型使用权限
	if (isAdvancedModel) {
		if (userType === UserType.GUEST || userType === UserType.REGULAR) {
			return {
				allowed: false,
				message: "高级模型需要会员权限，请先成为会员用户",
				userType,
			};
		}

		// 检查会员用户的高级模型调用次数
		if (userType === UserType.MEMBER && donationAmount > 0) {
			const maxCalls = calculateAdvancedModelCalls(donationAmount);
			const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
			const usageKey = { dayKey, type: "advanced_model", key: userEmail };

			const usageDoc = await db_find(db_name, "daily_usage", usageKey);
			const currentUsage = usageDoc?.used ?? 0;

			if (currentUsage >= maxCalls) {
				return {
					allowed: false,
					message: `今日高级模型调用次数已用完（${maxCalls}次），请明日再试或增加捐赠`,
					userType,
					dailyAdvancedModelCalls: maxCalls,
					remainingAdvancedModelCalls: 0,
				};
			}

			// 消耗一次高级模型调用次数
			if (usageDoc) {
				await db_update(db_name, "daily_usage", usageKey, {
					used: currentUsage + 1,
					updatedAt: new Date(),
				});
			} else {
				await db_insert(db_name, "daily_usage", {
					...usageKey,
					used: 1,
					createdAt: new Date(),
				});
			}

			return {
				allowed: true,
				userType,
				dailyAdvancedModelCalls: maxCalls,
				remainingAdvancedModelCalls: maxCalls - currentUsage - 1,
			};
		}
	}

	// 对于游客用户，检查每日累计限制
	if (userType === UserType.GUEST && limits.dailyLimit) {
		const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		const ipKey = ip ? { dayKey, type: "ip", key: ip } : null;
		const fpKey = fingerprint ? { dayKey, type: "fp", key: fingerprint } : null;

		const readCounter = async (key: { dayKey: string; type: string; key: string } | null): Promise<number> => {
			if (!key)
				return 0;
			const doc = await db_find(db_name, "daily_usage", key);
			return doc?.used ?? 0;
		};

		const ipUsed = await readCounter(ipKey);
		const fpUsed = await readCounter(fpKey);
		const existedMax = Math.max(ipUsed, fpUsed);

		if (existedMax + textLength > limits.dailyLimit) {
			return {
				allowed: false,
				message: `游客当日累计上限为 ${limits.dailyLimit.toLocaleString()} 字，请登录后继续使用`,
				userType,
			};
		}

		const incCounter = async (key: { dayKey: string; type: string; key: string } | null, delta: number) => {
			if (!key)
				return;
			const doc = await db_find(db_name, "daily_usage", key);
			if (doc) {
				await db_update(db_name, "daily_usage", key, {
					used: (doc.used ?? 0) + delta,
					updatedAt: new Date(),
				});
			} else {
				await db_insert(db_name, "daily_usage", {
					...key,
					used: delta,
					createdAt: new Date(),
				});
			}
		};

		// 同步增加 IP 与 指纹计数，防止绕过
		await incCounter(ipKey, textLength);
		await incCounter(fpKey, textLength);
	}

	return {
		allowed: true,
		userType,
		...(userType === UserType.MEMBER && donationAmount > 0 && {
			dailyAdvancedModelCalls: calculateAdvancedModelCalls(donationAmount),
			remainingAdvancedModelCalls: calculateAdvancedModelCalls(donationAmount) - 0, // 基础模型不消耗
		}),
	};
};

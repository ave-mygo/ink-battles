"use server";

import type { AuthUserInfo, AuthUserInfoSafe } from "@/types/users/user";
import process from "node:process";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import md5 from "md5";
import { cookies } from "next/headers";
import { getConfig } from "@/config";
import { db_name } from "@/lib/constants";

import { db_find, db_insert } from "@/lib/db";

import { generateNextUID } from "@/utils/auth";
import { initializeUserBilling } from "@/utils/billing/server";
import "server-only";

const {
	jwt: {
		secret: JWT_SECRET,
	},
} = getConfig();

/**
 * 用户注册
 * @param email 邮箱
 * @param password 密码
 * @returns { success, message, uid } 注册结果对象，包含是否成功、提示信息和用户 UID
 */
export async function registerUser(email: string, password: string): Promise<{ success: boolean; message: string; uid?: number }> {
	if (!email || !password) {
		return { success: false, message: "邮箱和密码不能为空" };
	}
	const existing = await db_find(db_name, "users", { email });
	if (existing) {
		return { success: false, message: "该邮箱已注册" };
	}

	const uid = await generateNextUID();

	const passwordHash = await bcrypt.hash(password, 10);
	const createdAt = new Date();
	const ok = await db_insert(db_name, "users", {
		uid,
		email,
		passwordHash,
		loginMethod: "email",
		isActive: true,
		createdAt,
		updatedAt: createdAt,
	});
	if (!ok) {
		return { success: false, message: "注册失败，请重试" };
	}

	// 初始化用户计费信息（赠送20次调用）
	await initializeUserBilling(uid);

	return { success: true, message: "注册成功，请登录", uid };
}

/**
 * 用户登录
 * @param email 邮箱
 * @param password 密码
 * @returns { success, message } 登录结果对象，包含是否成功和提示信息
 */
export async function LoginUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
	// 类型校验
	const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
	const normalizedPassword = typeof password === "string" ? password : "";

	if (!normalizedEmail || !normalizedPassword) {
		return { success: false, message: "邮箱或密码错误" };
	}

	// 邮箱格式校验
	const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/u;
	if (!emailRegex.test(normalizedEmail)) {
		return { success: false, message: "邮箱或密码错误" };
	}

	const user = await db_find(db_name, "users", { email: normalizedEmail });
	if (!user) {
		return { success: false, message: "邮箱或密码错误" };
	}
	const match = await bcrypt.compare(normalizedPassword, user.passwordHash);
	if (!match) {
		return { success: false, message: "邮箱或密码错误" };
	}
	const secret = new TextEncoder().encode(JWT_SECRET || "dev_secret_change_me");
	const token = await new SignJWT({ uid: user.uid })
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("7d")
		.sign(secret);
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

/**
 * 检查用户是否已登录
 * @returns {Promise<boolean>} 是否已登录
 */
export const isUserLoggedIn = async (): Promise<boolean> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return false;
	try {
		const secret = new TextEncoder().encode(JWT_SECRET || "dev_secret_change_me");
		const { payload } = await jwtVerify(token, secret) as { payload: { uid?: number; email?: string } };

		if (payload.uid) {
			const user = await db_find(db_name, "users", { uid: payload.uid });
			return !!user;
		}
		return false;
	} catch {
		return false;
	}
};

/**
 * 获取当前登录用户的邮箱
 * @returns 用户邮箱或null
 */
export const getCurrentUserEmail = async (): Promise<string | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;
	try {
		const secret = new TextEncoder().encode(JWT_SECRET || "dev_secret_change_me");
		const { payload } = await jwtVerify(token, secret) as { payload: { uid?: number; email?: string } };
		if (payload.uid) {
			const user = await db_find(db_name, "users", { uid: payload.uid });
			return user?.email ?? null;
		}
		return payload.email ?? null;
	} catch {
		return null;
	}
};

/**
 * 获取当前登录用户的完整信息
 * @returns 用户信息或null
 */
export const getCurrentUserInfo = async (): Promise<AuthUserInfoSafe | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;

	try {
		const secret = new TextEncoder().encode(JWT_SECRET || "dev_secret_change_me");
		const { payload } = await jwtVerify(token, secret) as { payload: { uid: number } };
		const doc = await db_find(db_name, "users", { uid: payload.uid }) as AuthUserInfo;
		if (!doc)
			return null;
		// 将 Mongo 文档净化为可序列化的纯对象
		const { _id, createdAt, updatedAt, ...rest } = doc;
		const safe: AuthUserInfoSafe = {
			...rest,
			createdAt: createdAt ? new Date(createdAt).toISOString() : null,
			updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
		};
		return safe;
	} catch {
		return null;
	}
};

/**
 * 用户注销，清空cookies
 * @returns { success, message } 注销结果对象
 */
export const logoutUser = async (): Promise<{ success: boolean; message: string }> => {
	const cookieStore = await cookies();
	cookieStore.delete("auth-token");
	return { success: true, message: "注销成功" };
};

/**
 * 获取用户头像 URL
 * 优先级：QQ > 爱发电 > Email
 * @param uid 用户UID
 * @returns 头像URL
 */
export async function getUserAvatarUrl(uid: number): Promise<string> {
	const user = await db_find(db_name, "users", { uid }) as any;
	// 1. QQ (优先使用数据库中存储的 avatar)
	if (user.qqOpenid && user.avatar) {
		return user.avatar;
	}

	// 2. 爱发电
	if (user.afdId) {
		const afdAvatar = await db_find(db_name, "afd_users", { uid });
		if (afdAvatar) {
			return afdAvatar.avatar;
		}
	}

	// 3. Email (Gravatar)
	if (user.email) {
		const hash = md5(user.email.trim().toLowerCase());
		return `https://www.gravatar.com/avatar/${hash}?d=mp`;
	}

	// 4. 默认
	return `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;
}

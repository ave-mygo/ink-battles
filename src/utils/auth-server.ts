"use server";

import process from "node:process";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db_name } from "@/lib/constants";
import { db_find, db_insert, db_read } from "@/lib/db";
import "server-only";

export interface UserInfo {
	uid: number;
	email?: string | null;
	nickname?: string | null;
	avatar?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}

/**
 * 生成下一个用户UID
 * @returns 新的用户UID
 */
async function generateNextUID(): Promise<number> {
	try {
		// 查询最大的UID
		const users = await db_read(db_name, "users", {}, { sort: { uid: -1 }, limit: 1 });
		if (users.length === 0) {
			return 1; // 第一个用户从1开始
		}
		return (users[0].uid || 0) + 1;
	} catch (error) {
		console.error("生成UID失败:", error);
		// 如果查询失败，使用时间戳作为备用方案
		return Date.now() % 1000000;
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
	const existing = await db_find(db_name, "users", { email });
	if (existing) {
		return { success: false, message: "该邮箱已注册" };
	}
	const uid = await generateNextUID();
	const passwordHash = await bcrypt.hash(password, 10);
	const createdAt = new Date();
	const ok = await db_insert(db_name, "users", { uid, email, passwordHash, createdAt });
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
	const secret = process.env.JWT_SECRET || "dev_secret_change_me";
	const token = jwt.sign({ uid: user.uid, email, loginMethod: "email" }, secret, { expiresIn: "7d" });
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

export const getCurrentUserEmail = async (): Promise<string | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;
	try {
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { uid?: number; email?: string };
		if (payload.uid) {
			// 优先使用UID查询用户，然后返回email
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
export const getCurrentUserInfo = async (): Promise<UserInfo | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;

	try {
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as {
			uid?: number;
			email?: string;
			qqOpenid?: string;
			loginMethod?: "email" | "qq";
		};

		let user: UserInfo | null = null;

		// 优先使用UID查询
		if (payload.uid) {
			user = await db_find(db_name, "users", { uid: payload.uid });
		} else if (payload.email) {
			// 向后兼容：如果没有UID，使用email查询
			user = await db_find(db_name, "users", { email: payload.email });
		} else if (payload.qqOpenid) {
			// 向后兼容：如果没有UID，使用qqOpenid查询
			user = await db_find(db_name, "users", { qqOpenid: payload.qqOpenid });
		}

		return user;
	} catch {
		return null;
	}
};

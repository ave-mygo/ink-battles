"use server";

import type { AuthUserInfo } from "@/types/auth/user";
import process from "node:process";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getConfig } from "@/config";
import { db_name } from "@/lib/constants";
import { db_find, db_insert } from "@/lib/db";

import { generateNextUID } from "@/utils/auth";

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
	const secret = JWT_SECRET || "dev_secret_change_me";
	const token = jwt.sign({ uid: user.uid }, secret, { expiresIn: "7d" });
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
 * 获取当前登录用户的邮箱
 * @returns 用户邮箱或null
 */
export const getCurrentUserEmail = async (): Promise<string | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;
	try {
		const secret = JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { uid?: number; email?: string };
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
export const getCurrentUserInfo = async (): Promise<AuthUserInfo | null> => {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		return null;

	try {
		const secret = JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as {
			uid: number;
		};
		return await db_find(db_name, "users", { uid: payload.uid });
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

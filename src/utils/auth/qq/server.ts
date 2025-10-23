"use server";

import type { AuthUserInfo, AuthUserInfoSafe } from "@/types/users/user";
import process from "node:process";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { getConfig } from "@/config";
import { db_name } from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";
import { generateNextUID } from "@/utils/auth";

import "server-only";

const {
	jwt: {
		secret: JWT_SECRET,
	},
} = getConfig();

/**
 * QQ登录：使用临时代码获取用户信息并创建/更新用户
 * @param tempCode 临时授权码
 * @returns 登录结果
 */
export const LoginWithQQ = async (tempCode: string): Promise<{ success: boolean; message: string; userInfo?: AuthUserInfoSafe }> => {
	if (!tempCode) {
		return { success: false, message: "授权码不能为空" };
	}

	try {
		const response = await fetch(`https://api-space.tnxg.top/user/get?code=${tempCode}`);
		const data = await response.json();

		if (data.status !== "success") {
			return { success: false, message: data.message || "获取用户信息失败" };
		}

		const qqUserInfo = data.data;
		const { qq_openid } = qqUserInfo;

		if (!qq_openid) {
			return { success: false, message: "QQ用户信息不完整" };
		}

		let user = await db_find(db_name, "users", { qqOpenid: qq_openid });
		const now = new Date();

		if (!user) {
			const uid = await generateNextUID();
			const newUser: AuthUserInfo = {
				uid,
				qqOpenid: qq_openid,
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

		// 净化返回到客户端的用户信息
		const { _id, createdAt, updatedAt, ...rest } = user as any;
		const safeUser: AuthUserInfoSafe = {
			...rest,
			createdAt: createdAt ? new Date(createdAt).toISOString() : null,
			updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
		};

		return {
			success: true,
			message: "QQ登录成功",
			userInfo: safeUser,
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
		const response = await fetch(`https://api-space.tnxg.top/user/info?code=${tempCode}`);
		const data = await response.json();

		if (data.status !== "success") {
			return { success: false, message: "获取QQ用户信息失败" };
		}

		const { qq_openid, nickname, avatar } = data.data;

		const emailUser = await db_find(db_name, "users", { email });
		if (!emailUser) {
			return { success: false, message: "邮箱用户不存在" };
		}

		// 检查QQ是否已绑定其他用户（使用UID进行更准确的比较）
		const qqUser = await db_find(db_name, "users", { qqOpenid: qq_openid });
		if (qqUser && qqUser.uid !== emailUser.uid) {
			return { success: false, message: "该QQ已绑定其他用户" };
		}

		// 使用UID更新用户信息
		await db_update(db_name, "users", { uid: emailUser.uid }, {
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
		// 检查邮箱是否已被其他用户使用（使用UID进行比较）
		const emailUser = await db_find(db_name, "users", { email });
		const qqUser = await db_find(db_name, "users", { qqOpenid });

		if (!qqUser) {
			return { success: false, message: "QQ用户不存在" };
		}

		if (emailUser && emailUser.uid !== qqUser.uid) {
			return { success: false, message: "该邮箱已被其他用户使用" };
		}

		const { isPasswordValid } = await import("@/lib/password-strength");
		if (!isPasswordValid(password)) {
			return { success: false, message: "密码不符合要求。密码必须：至少8位字符、包含小写字母、数字和特殊字符" };
		}

		const passwordHash = await bcrypt.hash(password, 10);

		// 使用UID更新用户信息
		await db_update(db_name, "users", { uid: qqUser.uid }, {
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

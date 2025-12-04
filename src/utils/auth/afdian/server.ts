"use server";

import type { AfdUser } from "@/types/database";
import type { AuthUserInfo, AuthUserInfoSafe } from "@/types/users/user";
import process from "node:process";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { getConfig } from "@/config";
import { db_name } from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";
import { generateNextUID } from "@/utils/auth/common";
import { getCurrentUserInfo } from "@/utils/auth/server";
import { initializeUserBilling } from "@/utils/billing/server";
import { consumeInviteCode, isInviteCodeRequired, validateInviteCode } from "@/utils/invite";

import "server-only";

const {
	jwt: {
		secret: JWT_SECRET,
	},
	afdian: {
		client_id: AFDIAN_CLIENT_ID,
		client_secret: AFDIAN_CLIENT_SECRET,
		redirect_uri: AFDIAN_REDIRECT_URI,
	},
} = getConfig();

interface AfdianOAuthResponse {
	ec: number;
	em: string;
	data?: {
		user_id: string;
		user_private_id: string;
		name: string;
		avatar: string;
	};
}

/**
 * 统一的爱发电登录或注册 Action
 * 使用 code 获取 user_id，自动判断是登录还是注册
 * @param code 爱发电授权码
 * @param inviteCode 邀请码（当配置启用邀请码且是新用户时必填）
 * @returns 登录或注册结果
 */
export const loginOrRegisterWithAfdian = async (
	code: string,
	inviteCode?: string,
): Promise<{ success: boolean; message: string; userInfo?: AuthUserInfoSafe; needInviteCode?: boolean }> => {
	if (!code) {
		console.error("[oauth/afdian]授权码不能为空");
		return { success: false, message: "授权码不能为空" };
	}

	try {
		const response = await fetch("https://afdian.com/api/oauth2/access_token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: AFDIAN_CLIENT_ID,
				client_secret: AFDIAN_CLIENT_SECRET,
				redirect_uri: AFDIAN_REDIRECT_URI,
				code,
			}),
		});

		const data: AfdianOAuthResponse = await response.json();

		if (data.ec !== 200 || !data.data) {
			console.error("[oauth/afdian]获取爱发电用户信息失败:", data.em);
			return { success: false, message: data.em || "获取爱发电用户信息失败" };
		}

		const { user_id, name, avatar } = data.data;

		if (!user_id) {
			console.error("[oauth/afdian]爱发电用户信息不完整");
			return { success: false, message: "爱发电用户信息不完整" };
		}

		// 查找用户
		let user = await db_find(db_name, "users", { afdId: user_id });
		const now = new Date();

		// 如果用户不存在，需要创建新用户
		if (!user) {
			// 检查是否需要邀请码
			const inviteRequired = await isInviteCodeRequired();
			if (inviteRequired) {
				if (!inviteCode) {
					return { success: false, message: "当前注册需要邀请码", needInviteCode: true };
				}
				const inviteValidation = await validateInviteCode(inviteCode);
				if (!inviteValidation.success) {
					return { ...inviteValidation, needInviteCode: true };
				}
			}

			const uid = await generateNextUID();
			const newUser: AuthUserInfo = {
				uid,
				afdId: user_id,
				loginMethod: "afd",
				createdAt: now,
				updatedAt: now,
				isActive: true,
			};

			const insertResult = await db_insert(db_name, "users", newUser);
			if (!insertResult) {
				console.error("[oauth/afdian]创建用户失败");
				return { success: false, message: "创建用户失败" };
			}

			// 初始化用户计费信息
			await initializeUserBilling(uid);

			// 如果使用了邀请码，标记为已使用
			if (inviteRequired && inviteCode) {
				await consumeInviteCode(inviteCode, uid);
			}

			user = newUser;
		}

		// 保存爱发电用户信息到 afd_users 表
		const afdUser: AfdUser = {
			uid: user.uid,
			afdId: user_id,
			avatar,
			nickname: name,
			updatedAt: now,
		};

		// 使用 uid 查找，确保每个用户只有一条爱发电信息记录
		const existingAfdUser = await db_find(db_name, "afd_users", { uid: user.uid });
		if (existingAfdUser) {
			await db_update(db_name, "afd_users", { uid: user.uid }, afdUser);
		} else {
			await db_insert(db_name, "afd_users", afdUser);
		}

		// 生成 JWT token
		const secret = new TextEncoder().encode(JWT_SECRET || "dev_secret_change_me");
		const token = await new SignJWT({ uid: user.uid })
			.setProtectedHeader({ alg: "HS256" })
			.setExpirationTime("7d")
			.sign(secret);

		// 设置 cookie
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
			message: "爱发电登录成功",
			userInfo: safeUser,
		};
	} catch (error) {
		console.error("[oauth/afdian]爱发电登录错误:", error);
		return { success: false, message: "服务器内部错误" };
	}
};

/**
 * 使用 code 绑定爱发电账号（需要已登录）
 * @param code 爱发电授权码
 * @returns 绑定结果
 */
export const bindAfdianAccountWithCode = async (code: string): Promise<{ success: boolean; message: string }> => {
	if (!code) {
		console.error("[oauth/afdian]授权码不能为空");
		return { success: false, message: "授权码不能为空" };
	}

	try {
		const currentUser = await getCurrentUserInfo();
		if (!currentUser) {
			console.error("[oauth/afdian]用户未登录");
			return { success: false, message: "用户未登录" };
		}

		const response = await fetch("https://afdian.com/api/oauth2/access_token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: AFDIAN_CLIENT_ID,
				client_secret: AFDIAN_CLIENT_SECRET,
				redirect_uri: AFDIAN_REDIRECT_URI,
				code,
			}),
		});

		const data: AfdianOAuthResponse = await response.json();

		if (data.ec !== 200 || !data.data) {
			console.error("[oauth/afdian]获取爱发电用户信息失败:", data.em);
			return { success: false, message: data.em || "获取爱发电用户信息失败" };
		}

		const { user_id, name, avatar } = data.data;

		// 检查该爱发电账号是否已被绑定
		const existingUser = await db_find(db_name, "users", { afdId: user_id });
		if (existingUser) {
			if (existingUser.uid === currentUser.uid) {
				// 即使已绑定，也更新一下 afd_users 信息
				const afdUser: AfdUser = {
					uid: currentUser.uid,
					afdId: user_id,
					avatar,
					nickname: name,
					updatedAt: new Date(),
				};
				// 使用 uid 查找，确保每个用户只有一条爱发电信息记录
				const existingAfdUser = await db_find(db_name, "afd_users", { uid: currentUser.uid });
				if (existingAfdUser) {
					await db_update(db_name, "afd_users", { uid: currentUser.uid }, afdUser);
				} else {
					await db_insert(db_name, "afd_users", afdUser);
				}
				return { success: true, message: "该爱发电账号已绑定到当前账号" };
			}
			console.error("[oauth/afdian]该爱发电账号已被其他账号绑定");
			return { success: false, message: "该爱发电账号已被其他账号绑定" };
		}

		// 更新当前用户
		const updateResult = await db_update(db_name, "users", { uid: currentUser.uid }, {
			$set: {
				afdId: user_id,
				updatedAt: new Date(),
			},
		});

		if (!updateResult) {
			console.error("[oauth/afdian]绑定失败");
			return { success: false, message: "绑定失败" };
		}

		// 保存爱发电用户信息到 afd_users 表
		const afdUser: AfdUser = {
			uid: currentUser.uid,
			afdId: user_id,
			avatar,
			nickname: name,
			updatedAt: new Date(),
		};

		// 使用 uid 查找，确保每个用户只有一条爱发电信息记录
		const existingAfdUser = await db_find(db_name, "afd_users", { uid: currentUser.uid });
		if (existingAfdUser) {
			await db_update(db_name, "afd_users", { uid: currentUser.uid }, afdUser);
		} else {
			await db_insert(db_name, "afd_users", afdUser);
		}

		return { success: true, message: "绑定成功" };
	} catch (error) {
		console.error("[oauth/afdian]爱发电绑定错误:", error);
		return { success: false, message: "服务器内部错误" };
	}
};

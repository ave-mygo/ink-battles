"use server";

import type { AuthUserInfo } from "@/types/users/user";
import { db_name } from "@/lib/constants";
import { db_find, db_update } from "@/lib/db";
import { getCurrentUserInfo } from "@/utils/auth/server";
import "server-only";

/**
 * 绑定 QQ 账号
 * @param qqOpenid QQ OpenID
 * @returns 绑定结果
 */
export const bindQQAccount = async (qqOpenid: string): Promise<{ success: boolean; message: string }> => {
	try {
		const currentUser = await getCurrentUserInfo();
		if (!currentUser) {
			return { success: false, message: "用户未登录" };
		}

		// 检查该 QQ 是否已被其他账号绑定
		const existingUser = await db_find(db_name, "users", { qqOpenid }) as AuthUserInfo | null;
		if (existingUser && existingUser.uid !== currentUser.uid) {
			return { success: false, message: "该 QQ 账号已被其他用户绑定" };
		}

		// 检查当前用户是否已绑定 QQ
		if (currentUser.qqOpenid) {
			return { success: false, message: "您已绑定 QQ 账号，请先解绑" };
		}

		// 更新用户信息
		const success = await db_update(
			db_name,
			"users",
			{ uid: currentUser.uid },
			{
				qqOpenid,
				updatedAt: new Date(),
			},
		);

		if (!success) {
			return { success: false, message: "绑定失败，请稍后重试" };
		}

		return { success: true, message: "QQ 账号绑定成功" };
	} catch (error) {
		console.error("绑定 QQ 账号失败:", error);
		return { success: false, message: "绑定失败，系统错误" };
	}
};

/**
 * 解绑 QQ 账号
 * @returns 解绑结果
 */
export const unbindQQAccount = async (): Promise<{ success: boolean; message: string }> => {
	try {
		const currentUser = await getCurrentUserInfo();
		if (!currentUser) {
			return { success: false, message: "用户未登录" };
		}

		if (!currentUser.qqOpenid) {
			return { success: false, message: "您尚未绑定 QQ 账号" };
		}

		// 检查是否至少保留一种登录方式
		if (!currentUser.email && currentUser.loginMethod === "qq") {
			return { success: false, message: "至少需要保留一种登录方式" };
		}

		// 更新用户信息
		const success = await db_update(
			db_name,
			"users",
			{ uid: currentUser.uid },
			{
				qqOpenid: null,
				updatedAt: new Date(),
			},
		);

		if (!success) {
			return { success: false, message: "解绑失败，请稍后重试" };
		}

		return { success: true, message: "QQ 账号解绑成功" };
	} catch (error) {
		console.error("解绑 QQ 账号失败:", error);
		return { success: false, message: "解绑失败，系统错误" };
	}
};

/**
 * 绑定邮箱
 * @param email 邮箱地址
 * @param password 密码（可选）
 * @returns 绑定结果
 */
export const bindEmailAccount = async (email: string, password?: string): Promise<{ success: boolean; message: string }> => {
	try {
		const currentUser = await getCurrentUserInfo();
		if (!currentUser) {
			return { success: false, message: "用户未登录" };
		}

		// 检查该邮箱是否已被其他账号使用
		const existingUser = await db_find(db_name, "users", { email }) as AuthUserInfo | null;
		if (existingUser && existingUser.uid !== currentUser.uid) {
			return { success: false, message: "该邮箱已被其他用户使用" };
		}

		// 检查当前用户是否已绑定邮箱
		if (currentUser.email) {
			return { success: false, message: "您已绑定邮箱，请先解绑" };
		}

		// 更新用户信息
		const updateData: any = {
			email,
			updatedAt: new Date(),
		};

		// 如果提供了密码，也更新密码
		if (password) {
			const bcrypt = await import("bcryptjs");
			updateData.passwordHash = await bcrypt.hash(password, 10);
		}

		const success = await db_update(
			db_name,
			"users",
			{ uid: currentUser.uid },
			updateData,
		);

		if (!success) {
			return { success: false, message: "绑定失败，请稍后重试" };
		}

		return { success: true, message: "邮箱绑定成功" };
	} catch (error) {
		console.error("绑定邮箱失败:", error);
		return { success: false, message: "绑定失败，系统错误" };
	}
};

/**
 * 解绑邮箱
 * @returns 解绑结果
 */
export const unbindEmailAccount = async (): Promise<{ success: boolean; message: string }> => {
	try {
		const currentUser = await getCurrentUserInfo();
		if (!currentUser) {
			return { success: false, message: "用户未登录" };
		}

		if (!currentUser.email) {
			return { success: false, message: "您尚未绑定邮箱" };
		}

		// 检查是否至少保留一种登录方式
		if (!currentUser.qqOpenid && currentUser.loginMethod === "email") {
			return { success: false, message: "至少需要保留一种登录方式" };
		}

		// 更新用户信息
		const success = await db_update(
			db_name,
			"users",
			{ uid: currentUser.uid },
			{
				email: null,
				passwordHash: null,
				updatedAt: new Date(),
			},
		);

		if (!success) {
			return { success: false, message: "解绑失败，请稍后重试" };
		}

		return { success: true, message: "邮箱解绑成功" };
	} catch (error) {
		console.error("解绑邮箱失败:", error);
		return { success: false, message: "解绑失败，系统错误" };
	}
};

/**
 * 获取账号绑定详情
 * @returns 账号绑定详情
 */
export const getAccountBindingDetails = async (): Promise<{
	email: { bound: boolean; value?: string | null };
	qq: { bound: boolean; value?: string | null };
	afdian: { bound: boolean; value?: string | null };
	loginMethod?: "email" | "qq" | "afd" | null;
}> => {
	const user = await getCurrentUserInfo();

	if (!user) {
		return {
			email: { bound: false },
			qq: { bound: false },
			afdian: { bound: false },
		};
	}

	return {
		email: {
			bound: !!user.email,
			value: user.email,
		},
		qq: {
			bound: !!user.qqOpenid,
			value: user.qqOpenid,
		},
		afdian: {
			bound: !!user.afdId,
			value: user.afdId,
		},
		loginMethod: user.loginMethod,
	};
};

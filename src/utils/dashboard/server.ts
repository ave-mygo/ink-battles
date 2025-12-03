"use server";

import type { AuthUserInfoSafe, UserProfileUpdate } from "@/types/users/user";
import { db_name } from "@/lib/constants";
import { db_update } from "@/lib/db";
import { getCurrentUserInfo } from "@/utils/auth/server";
import "server-only";

/**
 * 获取用户仪表盘数据
 * @returns 用户信息或null
 */
export const getDashboardUserInfo = async (): Promise<AuthUserInfoSafe | null> => {
	return await getCurrentUserInfo();
};

/**
 * 检查用户是否已绑定QQ
 * @returns 是否已绑定QQ
 */
export const isQQBound = async (): Promise<boolean> => {
	const user = await getCurrentUserInfo();
	return !!user?.qqOpenid;
};

/**
 * 检查用户是否已绑定邮箱
 * @returns 是否已绑定邮箱
 */
export const isEmailBound = async (): Promise<boolean> => {
	const user = await getCurrentUserInfo();
	return !!user?.email;
};

/**
 * 获取用户账号绑定状态
 * @returns 账号绑定状态对象
 */
export const getAccountBindings = async (): Promise<{
	email: boolean;
	qq: boolean;
	emailValue?: string | null;
}> => {
	const user = await getCurrentUserInfo();

	return {
		email: !!user?.email,
		qq: !!user?.qqOpenid,
		emailValue: user?.email,
	};
};

/**
 * 更新用户资料（昵称和签名）
 * @param profile 要更新的资料字段
 * @returns 更新结果
 */
export const updateUserProfile = async (profile: UserProfileUpdate): Promise<{
	success: boolean;
	message: string;
}> => {
	const user = await getCurrentUserInfo();
	if (!user) {
		return { success: false, message: "未登录" };
	}

	// 验证昵称长度
	if (profile.nickname !== undefined) {
		const nickname = profile.nickname.trim();
		if (nickname.length > 20) {
			return { success: false, message: "昵称不能超过 20 个字符" };
		}
	}

	// 验证签名长度
	if (profile.bio !== undefined) {
		const bio = profile.bio.trim();
		if (bio.length > 100) {
			return { success: false, message: "签名不能超过 100 个字符" };
		}
	}

	try {
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		if (profile.nickname !== undefined) {
			updateData.nickname = profile.nickname.trim() || null;
		}
		if (profile.bio !== undefined) {
			updateData.bio = profile.bio.trim() || null;
		}

		await db_update(db_name, "users", { uid: user.uid }, updateData);

		return { success: true, message: "资料更新成功" };
	} catch (error) {
		console.error("更新用户资料失败:", error);
		return { success: false, message: "更新失败，请稍后重试" };
	}
};

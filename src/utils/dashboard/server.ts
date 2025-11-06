"use server";

import type { AuthUserInfoSafe } from "@/types/users/user";
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

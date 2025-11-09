"use client";

import type { QQOAuthResponse } from "@/types/users/user";

/**
 * 使用临时代码获取QQ用户信息
 * @param tempCode 临时授权码
 * @returns QQ用户信息
 */
export const getQQUserInfo = async (tempCode: string): Promise<QQOAuthResponse> => {
	const response = await fetch(`https://api-space.tnxg.top/user/info?code=${tempCode}`);

	if (!response.ok) {
		throw new Error(`HTTP错误: ${response.status}`);
	}

	return await response.json();
};

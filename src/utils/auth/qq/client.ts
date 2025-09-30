"use client";

import type { QQOAuthResponse } from "@/types/users/user";

/**
 * 构建QQ OAuth授权URL
 * @param returnUrl 授权后回调地址
 * @param state 自定义状态参数
 * @returns 授权URL
 */
export const buildQQAuthUrl = (returnUrl: string, state?: string): string => {
	const baseUrl = "https://api-space.tnxg.top/oauth/qq/authorize";
	const params = new URLSearchParams({
		redirect: "true",
		return_url: returnUrl,
	});

	if (state) {
		params.append("state", state);
	}

	return `${baseUrl}?${params.toString()}`;
};

/**
 * 发起QQ OAuth登录
 * @param returnUrl 授权后回调地址
 * @param state 自定义状态参数
 */
export const initiateQQLogin = (returnUrl?: string, state?: string): void => {
	const currentUrl = returnUrl || window.location.href;
	const authState = state || `qq_login_${Date.now()}`;
	const authUrl = buildQQAuthUrl(currentUrl, authState);

	window.location.href = authUrl;
};

/**
 * 从URL参数中解析QQ OAuth回调信息
 * @returns 解析结果
 */
export const parseQQCallback = (): {
	code: string | null;
	state: string | null;
	error: string | null;
	errorDescription: string | null;
} => {
	const urlParams = new URLSearchParams(window.location.search);

	return {
		code: urlParams.get("code"),
		state: urlParams.get("state"),
		error: urlParams.get("error"),
		errorDescription: urlParams.get("error_description"),
	};
};

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

/**
 * 清理URL中的OAuth回调参数
 */
export const cleanupOAuthParams = (): void => {
	const url = new URL(window.location.href);
	url.searchParams.delete("code");
	url.searchParams.delete("state");
	url.searchParams.delete("error");
	url.searchParams.delete("error_description");

	window.history.replaceState({}, document.title, url.toString());
};

/**
 * 检查当前页面是否为QQ OAuth回调
 * @returns 是否为OAuth回调
 */
export const isQQOAuthCallback = (): boolean => {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.has("code") || urlParams.has("error");
};

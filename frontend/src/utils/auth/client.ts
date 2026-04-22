"use client";

import type { AuthUserInfoSafe, UserStore } from "@ink-battles/shared/types/users";
import { clearAuthStore, syncAuthStoreAfterLogin } from "@/store";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

type VerificationType = "register" | "login" | "reset-password";

const mapAuthToUserStore = (user: AuthUserInfoSafe): UserStore => ({
	uid: String(user.uid),
	nickname: user.nickname || user.email?.split("@")[0] || "用户",
	avatar: (user as AuthUserInfoSafe & { avatar?: string }).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
	isLoggedIn: true,
});

const getAuthApi = () => createClientEden().api.v2;

const unwrapAuthResponse = <T>(data: unknown, error: unknown): ApiResponse<T> =>
	(data ?? error ?? { success: false, message: "请求失败" }) as ApiResponse<T>;

/**
 * 使用 Eden 调用登录接口。
 */
export const loginWithPassword = async (email: string, password: string) => {
	const { data, error } = await getAuthApi().rpc["auth.login"].post({ email, password });
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "登录失败");
};

/**
 * 使用 Eden 调用注册接口。
 */
export const registerWithPassword = async (payload: { email: string; password: string; code: string; inviteCode?: string }) => {
	const { data, error } = await getAuthApi().rpc["auth.register"].post(payload);
	return normalizeEdenResult<{ success: boolean; message?: string }>(data, error, "注册失败");
};

/**
 * 使用 Eden 发送认证验证码。
 */
export const sendVerificationEmail = async (email: string, type: VerificationType = "register") => {
	const { data, error } = await getAuthApi().rpc["auth.sendVerificationCode"].post({ email, type });
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "发送失败");
};

export const loginSetState = async () => {
	try {
		const { data, error } = await getAuthApi().auth.me.get();
		const response = unwrapAuthResponse<AuthUserInfoSafe | null>(data, error);
		if (response.success && response.data) {
			syncAuthStoreAfterLogin(mapAuthToUserStore(response.data));
			return response.data;
		}
		clearAuthStore();
		return null;
	} catch (error) {
		console.error("获取用户信息失败:", error);
		clearAuthStore();
		return null;
	}
};

export const logoutSetState = async () => {
	try {
		clearAuthStore();
		await getAuthApi().rpc["auth.logout"].post();
	} catch (error) {
		console.error("登出状态清理失败:", error);
	}
};

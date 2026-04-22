import type { ApiResult } from "@ink-battles/shared/types/api";
import type { AuthUserInfoSafe } from "@ink-battles/shared/types/users/user";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

const unwrapAuthResponse = <T>(data: unknown, error: unknown): ApiResult<T> =>
	(data ?? error ?? { success: false, message: "请求失败" }) as ApiResult<T>;

export async function registerUser(email: string, password: string): Promise<{ success: boolean; message: string; uid?: number }> {
	const api = await createServerEden();
	const { data, error } = await api.api.v2.rpc["auth.register"].post({ email, password, code: "" });
	return normalizeEdenResult<{ success: boolean; message: string; uid?: number }>(data, error, "注册失败");
}

export async function LoginUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
	const api = await createServerEden();
	const { data, error } = await api.api.v2.rpc["auth.login"].post({ email, password });
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "登录失败");
}

export const isUserLoggedIn = async (): Promise<boolean> => {
	const api = await createServerEden();
	const { data, error } = await api.api.v2.auth.me.get();
	const response = unwrapAuthResponse<AuthUserInfoSafe | null>(data, error);
	return response.success && !!response.data;
};

export const getCurrentUserInfo = async (): Promise<AuthUserInfoSafe | null> => {
	const api = await createServerEden();
	const { data, error } = await api.api.v2.auth.me.get();
	const response = unwrapAuthResponse<AuthUserInfoSafe | null>(data, error);
	return response.success ? response.data ?? null : null;
};

export const getCurrentUserEmail = async (): Promise<string | null> => {
	const user = await getCurrentUserInfo();
	return user?.email ?? null;
};

export const logoutUser = async (): Promise<{ success: boolean; message: string }> => {
	const api = await createServerEden();
	const { data, error } = await api.api.v2.rpc["auth.logout"].post();
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "注销失败");
};

export async function getUserAvatarUrl(uid: number): Promise<string> {
	const user = await getCurrentUserInfo();
	return (user as (AuthUserInfoSafe & { avatar?: string }) | null)?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;
}

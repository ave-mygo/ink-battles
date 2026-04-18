import type { AuthUserInfoSafe } from "@/types/users/user";
import { createServerEden } from "@/utils/api/eden-server";

interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
}

export const getDashboardUserInfo = async (): Promise<AuthUserInfoSafe | null> => {
	const api = await createServerEden();
	const { data, error } = await api.api.v2.auth.me.get();
	const response = (data ?? error) as ApiResponse<AuthUserInfoSafe | null>;
	return response.success ? response.data ?? null : null;
};

export const isQQBound = async (): Promise<boolean> => !!(await getDashboardUserInfo())?.qqOpenid;

export const isEmailBound = async (): Promise<boolean> => !!(await getDashboardUserInfo())?.email;

export const getAccountBindings = async () => {
	const user = await getDashboardUserInfo();
	return {
		email: !!user?.email,
		qq: !!user?.qqOpenid,
		emailValue: user?.email,
	};
};

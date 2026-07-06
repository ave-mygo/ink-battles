"use client";

import type { AuthUserInfoSafe, UserStore } from "@ink-battles/shared/types/users";
import { clearAuthStore, syncAuthStoreAfterLogin } from "@/store";
import { createClientEden } from "@/utils/api/eden-client";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const mapAuthToUserStore = (user: AuthUserInfoSafe): UserStore => ({
  uid: String(user.uid),
  nickname: user.nickname || user.email?.split("@")[0] || "用户",
  avatar: (user as AuthUserInfoSafe & { avatar?: string }).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
  isLoggedIn: true,
});

const getAuthApi = () => createClientEden().api.v2;

const unwrapAuthResponse = <T>(data: unknown, error: unknown): ApiResponse<T> =>
  (data ?? error ?? { success: false, message: "请求失败" }) as ApiResponse<T>;

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
  clearAuthStore();
  try {
    const { data, error } = await getAuthApi().rpc["auth.logout"].post();
    const response = unwrapAuthResponse<null>(data, error);
    if (!response.success) {
      throw new Error(response.message || "登出失败");
    }
  } catch (error) {
    console.error("登出状态清理失败:", error);
    throw error;
  } finally {
    clearAuthStore();
  }
};

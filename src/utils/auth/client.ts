"use client";

import type { AuthUserInfoSafe, UserStore } from "@/types/users";
import { clearAuthStore, syncAuthStoreAfterLogin } from "@/store";
import { getCurrentUserInfo, logoutUser } from "./server";

const mapAuthToUserStore = (user: AuthUserInfoSafe): UserStore => {
	return {
		uid: String(user.uid),
		nickname: user.email?.split("@")[0] || "用户",
		avatar: "",
		isLoggedIn: true,
	};
};

/**
 * 登录后同步状态到客户端 Store
 * 在登录成功后调用，确保用户状态同步到客户端
 */
export const loginSetState = async () => {
	try {
		const info = await getCurrentUserInfo();
		if (info) {
			syncAuthStoreAfterLogin(mapAuthToUserStore(info));
		} else {
			clearAuthStore();
		}
		return info;
	} catch (error) {
		console.error("获取用户信息失败:", error);
		clearAuthStore();
	}
};

/**
 * 登出清理状态
 * 清理客户端 Store 和服务端 Session
 */
export const logoutSetState = async () => {
	try {
		clearAuthStore();
		await logoutUser();
	} catch (error) {
		console.error("登出状态清理失败:", error);
	}
};

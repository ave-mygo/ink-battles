"use client";

import type { UserStore, UserStoreData } from "@/types/users";
import { useEffect } from "react";
import { create } from "zustand";

/**
 * 用户认证状态管理
 * 管理用户登录状态、用户信息和加载状态
 */
export const useAuthStore = create<UserStoreData>()(
	set => ({
		user: null,
		// 初始为 true，直到客户端完成持久化数据的水合
		loading: true,

		// 设置用户信息并标记为已登录
		setUser: (user: UserStore) => set({ user, loading: false }),

		// 退出登录，清空用户信息
		logout: () => set({ user: null, loading: false }),

		// 清空store和本地存储
		clearStore: () => {
			set({ user: null, loading: false });
			// 清空持久化存储
			localStorage.removeItem("ib-auth");
		},

		// 设置加载状态
		setLoading: (loading: boolean) => set({ loading }),
	}),
);

// 选择器 hooks - 只获取数据，不包含 actions
export const useCurrentUser = () => useAuthStore(state => state.user);
export const useAuthLoading = () => useAuthStore(state => state.loading);
export const useIsAuthenticated = () => useAuthStore(state => !!state.user?.isLoggedIn);

// 操作 hooks - 只包含 actions
export const useAuthActions = () => {
	const setUser = useAuthStore(state => state.setUser);
	const logout = useAuthStore(state => state.logout);
	const clearStore = useAuthStore(state => state.clearStore);
	const setLoading = useAuthStore(state => state.setLoading);

	return { setUser, logout, clearStore, setLoading };
};

/**
 * 同步登录后的用户数据到客户端 Store
 * 用法：在登录请求成功后调用
 */
export const syncAuthStoreAfterLogin = (user: UserStore) => {
	// 直接写入 store，并确保是“已登录”态
	useAuthStore.getState().setUser({ ...user, isLoggedIn: true });
};

/**
 * 清空客户端 Store（通常搭配服务端登出一起调用）
 */
export const clearAuthStore = () => {
	useAuthStore.getState().clearStore();
};

/**
 * 客户端水合 hook
 * 确保持久化存储的数据在客户端正确加载
 */
export const useAuthHydration = () => {
	const { setLoading } = useAuthActions();

	useEffect(() => {
		// 手动触发持久化状态的水合（因启用了 skipHydration）
		const anyStore = useAuthStore as unknown as { persist?: { rehydrate?: () => void } };
		try {
			anyStore.persist?.rehydrate?.();
		} finally {
			// 结束加载态（即使本地没有持久化数据，也要结束加载）
			setLoading(false);
		}
	}, [setLoading]);
};

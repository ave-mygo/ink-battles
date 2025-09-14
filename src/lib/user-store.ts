import type { UserStore, UserStoreData } from "@/types/users/store";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// 服务端快照缓存，避免无限循环
let userServerSnapshot: UserStoreData | null = null;

/**
 * 获取用户状态的服务端快照，用于避免水合不匹配
 * 这个函数会被缓存以避免无限循环
 */
export const getUserServerSnapshot = (): UserStoreData => {
	if (userServerSnapshot === null) {
		userServerSnapshot = {
			user: null,
			loading: false,
			setUser: () => {},
			logout: () => {},
			setLoading: () => {},
		};
	}
	return userServerSnapshot;
};

// 创建用户状态管理 store
export const useUserStoreData = create<UserStoreData>()(
	persist(
		set => ({
			user: null,
			loading: false,

			// 设置用户信息
			setUser: (user: UserStore) => set({ user, loading: false }),

			// 退出登录
			logout: () => set({ user: null, loading: false }),

			// 设置加载状态
			setLoading: (loading: boolean) => set({ loading }),
		}),
		{
			name: "user-storage", // 本地存储的 key
			// 只持久化用户信息，不持久化加载状态
			partialize: state => ({ user: state.user }),
			// 跳过服务端渲染时的水合，避免不匹配
			skipHydration: true,
		},
	),
);

// 导出便捷的 hooks
export const useUser = () => useUserStoreData(state => state.user);
export const useUserLoading = () => useUserStoreData(state => state.loading);
export const useUserActions = () => useUserStoreData(state => ({
	setUser: state.setUser,
	logout: state.logout,
	setLoading: state.setLoading,
}));

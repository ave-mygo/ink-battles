import type { UserStore } from "@ink-battles/shared/types/users";

interface AuthUserStoreSource {
  uid: number;
  email?: string | null;
  nickname?: string | null;
  avatar?: string | null;
}

/**
 * 将服务端安全用户信息映射为客户端导航需要的最小登录态。
 */
export const mapAuthUserToStore = (user: AuthUserStoreSource): UserStore => ({
  uid: String(user.uid),
  nickname: user.nickname || user.email?.split("@")[0] || "用户",
  avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
  isLoggedIn: true,
});

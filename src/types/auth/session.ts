/**
 * 认证状态类型
 * 来源：use-auth.ts
 */
export interface AuthState {
	email: string | null;
	isLoggedIn: boolean;
}

/**
 * 认证系统用户信息类型
 * 来源：auth-server.ts
 */
export interface AuthUserInfo {
	uid: number;
	email?: string | null;
	nickname?: string | null;
	avatar?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}

/**
 * 订阅系统用户信息类型
 * 来源：subscription.ts
 */
export interface SubscriptionUserInfo {
	id: string;
	username: string;
	email: string;
	avatar: string;
	afdian_user_id?: string;
	afdian_bound: boolean;
	afdian_username?: string;
	afdian_avatar?: string;
	qqOpenid?: string;
	loginMethod?: "email" | "qq";
	admin?: boolean;
}

/**
 * 基础用户信息类型
 * 来源：utils-server.ts
 */
export interface BaseUserInfo {
	email?: string | null;
	nickname?: string | null;
	avatar?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}

export interface QQUserInfo {
	user_id: string;
	qq_openid: string;
	nickname: string;
	avatar: string;
	gender: string;
	created_at: string;
	updated_at: string;
}

export interface QQOAuthResponse {
	status: string;
	code: string;
	message: string;
	data: QQUserInfo;
}

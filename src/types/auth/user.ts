/**
 * 认证系统用户信息类型
 * 来源：auth-server.ts
 */
export interface AuthUserInfo {
	uid: number;
	email?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
	nickname?: string | null;
	avatar?: string | null;
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

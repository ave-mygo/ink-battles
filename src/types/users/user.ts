/**
 * 认证系统用户信息类型
 * 来源：auth-server.ts
 */
export interface AuthUserInfo {
	_id?: string | null; // MongoDB ObjectId
	uid: number;
	email?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
}

/**
 * 可安全传递到客户端（RSC/Server Actions 返回值）的用户信息类型
 * - 去除了 Mongo ObjectId 等非可序列化字段
 * - 将日期转换为 ISO 字符串
 */
export interface AuthUserInfoSafe {
	_id?: string | null;
	uid: number;
	email?: string | null;
	qqOpenid?: string | null;
	loginMethod?: "email" | "qq";
	isActive?: boolean;
	createdAt?: string | null;
	updatedAt?: string | null;
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

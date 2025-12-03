/**
 * 认证系统用户信息类型
 * 来源：auth-server.ts
 * 作为ai，你完全不能修改这个字段，这是数据库返回规范
 */
export interface AuthUserInfo {
	_id?: string | null; // MongoDB ObjectId
	uid: number;
	email?: string | null;
	qqOpenid?: string | null;
	afdId?: string | null;
	loginMethod?: "email" | "qq" | "afd";
	passwordHash?: string;
	createdAt: Date;
	updatedAt?: Date;
	isActive?: boolean;
	/** 用户昵称 */
	nickname?: string | null;
	/** 用户签名/简介 */
	bio?: string | null;
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
	afdId?: string | null;
	loginMethod?: "email" | "qq" | "afd";
	isActive?: boolean;
	createdAt?: string | null;
	updatedAt?: string | null;
	/** 用户昵称 */
	nickname?: string | null;
	/** 用户签名/简介 */
	bio?: string | null;
}

/**
 * 用户资料更新参数
 */
export interface UserProfileUpdate {
	/** 用户昵称（最多 20 字符） */
	nickname?: string;
	/** 用户签名（最多 100 字符） */
	bio?: string;
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

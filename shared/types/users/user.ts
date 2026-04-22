export type LoginMethod = "email" | "qq" | "afd";

export interface AuthUserInfo {
	_id?: string | null;
	uid: number;
	email?: string | null;
	qqOpenid?: string | null;
	afdId?: string | null;
	loginMethod?: LoginMethod | null;
	passwordHash?: string | null;
	createdAt: Date;
	updatedAt?: Date | null;
	isActive?: boolean;
	nickname?: string | null;
	bio?: string | null;
	avatar?: string | null;
}

export interface AuthUserInfoSafe {
	_id?: string | null;
	uid: number;
	email?: string | null;
	qqOpenid?: string | null;
	afdId?: string | null;
	loginMethod?: LoginMethod | null;
	isActive?: boolean;
	createdAt?: string | null;
	updatedAt?: string | null;
	nickname?: string | null;
	bio?: string | null;
	avatar?: string | null;
}

export type AuthUser = AuthUserInfo;
export type SafeUser = AuthUserInfoSafe;

export interface UserProfileUpdate {
	nickname?: string;
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

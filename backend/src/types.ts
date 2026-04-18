import type { ObjectId } from "mongodb";

export interface AuthUser {
	_id?: ObjectId;
	uid: number;
	email?: string | null;
	passwordHash?: string | null;
	qqOpenid?: string | null;
	afdId?: string | null;
	nickname?: string | null;
	bio?: string | null;
	avatar?: string | null;
	loginMethod?: "email" | "qq" | "afd" | null;
	isActive?: boolean;
	createdAt?: Date | string | null;
	updatedAt?: Date | string | null;
}

export interface SafeUser {
	uid: number;
	email?: string | null;
	qqOpenid?: string | null;
	afdId?: string | null;
	nickname?: string | null;
	bio?: string | null;
	avatar?: string | null;
	loginMethod?: "email" | "qq" | "afd" | null;
	isActive?: boolean;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface UserBilling {
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	lastGrantRefresh: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface ApiResult<T = unknown> {
	success: boolean;
	message?: string;
	error?: string;
	data?: T;
}

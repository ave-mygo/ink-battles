"use server";

import { isInviteCodeRequired as checkInviteCodeRequired } from "@/config";
import { db_name } from "@/lib/constants";
import { db_find, db_update } from "@/lib/db";

import "server-only";

/**
 * 邀请码数据结构
 */
export interface InviteCode {
	code: string;
	createdAt: Date;
	createdBy?: number; // 创建者 UID
	usedAt?: Date;
	usedBy?: number; // 使用者 UID
	maxUses: number; // 最大使用次数，0 表示无限制
	usedCount: number; // 已使用次数
	expiresAt?: Date; // 过期时间
	isActive: boolean; // 是否激活
	note?: string; // 备注
}

/**
 * 检查是否需要邀请码注册
 * @returns 是否需要邀请码
 */
export async function isInviteCodeRequired(): Promise<boolean> {
	return checkInviteCodeRequired();
}

/**
 * 验证邀请码是否有效
 * @param code 邀请码
 * @returns 验证结果
 */
export async function validateInviteCode(code: string): Promise<{ success: boolean; message: string }> {
	if (!code) {
		return { success: false, message: "邀请码不能为空" };
	}

	const inviteCode = await db_find(db_name, "invite_codes", { code: code.trim().toUpperCase() }) as InviteCode | null;

	if (!inviteCode) {
		return { success: false, message: "邀请码不存在" };
	}

	if (!inviteCode.isActive) {
		return { success: false, message: "邀请码已被禁用" };
	}

	// 检查是否过期
	if (inviteCode.expiresAt && new Date(inviteCode.expiresAt).getTime() < Date.now()) {
		return { success: false, message: "邀请码已过期" };
	}

	// 检查使用次数
	if (inviteCode.maxUses > 0 && inviteCode.usedCount >= inviteCode.maxUses) {
		return { success: false, message: "邀请码已达到最大使用次数" };
	}

	return { success: true, message: "邀请码有效" };
}

/**
 * 消费邀请码（在用户注册成功后调用）
 * @param code 邀请码
 * @param uid 使用者 UID
 * @returns 使用结果
 */
export async function consumeInviteCode(code: string, uid: number): Promise<{ success: boolean; message: string }> {
	if (!code) {
		return { success: false, message: "邀请码不能为空" };
	}

	const inviteCode = await db_find(db_name, "invite_codes", { code: code.trim().toUpperCase() }) as InviteCode | null;

	if (!inviteCode) {
		return { success: false, message: "邀请码不存在" };
	}

	// 更新使用次数和使用者信息
	const updateResult = await db_update(
		db_name,
		"invite_codes",
		{ code: code.trim().toUpperCase() },
		{
			$inc: { usedCount: 1 },
			$set: { usedAt: new Date(), usedBy: uid },
		},
	);

	if (!updateResult) {
		return { success: false, message: "更新邀请码使用记录失败" };
	}

	return { success: true, message: "邀请码使用成功" };
}

"use server";

import bcrypt from "bcryptjs";
import { db_name } from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";
import { isPasswordValid } from "@/lib/password-strength";
import { sendVerificationEmail } from "@/lib/smtp";
import { registerUser } from "@/utils/auth";
import { consumeInviteCode, isInviteCodeRequired, validateInviteCode } from "@/utils/invite";

import "server-only";

type VerificationType = "register" | "login";

/**
 * 发送邮箱验证码（SMTP）
 * @param email 邮箱地址
 * @param type 验证类型：register/login
 * @returns { success, message } 发送结果
 */
export const SendVerificationEmail = async (
	email: string,
	type: VerificationType = "register",
): Promise<{ success: boolean; message: string }> => {
	if (!email) {
		return { success: false, message: "邮箱不能为空" };
	}

	const code = Math.floor(100000 + Math.random() * 900000).toString();
	const codeHash = await bcrypt.hash(code, 10);
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000);

	const existed = await db_find(db_name, "email_verification_codes", { email, type, used: false });
	if (existed) {
		await db_update(db_name, "email_verification_codes", { _id: existed._id }, { codeHash, createdAt, expiresAt });
	} else {
		await db_insert(db_name, "email_verification_codes", { email, type, codeHash, createdAt, expiresAt, used: false });
	}

	const result = await sendVerificationEmail(email, code, type);

	return result;
};

/**
 * 校验邮箱验证码
 * @param email 邮箱
 * @param code 验证码
 * @param type 验证类型
 * @returns { success, message } 校验结果
 */
export const VerifyEmailCode = async (
	email: string,
	code: string,
	type: VerificationType = "register",
): Promise<{ success: boolean; message: string }> => {
	if (!email || !code) {
		return { success: false, message: "邮箱和验证码不能为空" };
	}

	const record = await db_find(db_name, "email_verification_codes", { email, type, used: false });
	if (!record) {
		return { success: false, message: "验证码不存在，请重新发送" };
	}
	if (new Date(record.expiresAt).getTime() < Date.now()) {
		return { success: false, message: "验证码已过期，请重新发送" };
	}
	const ok = await bcrypt.compare(code, record.codeHash);
	if (!ok) {
		return { success: false, message: "验证码错误" };
	}
	await db_update(db_name, "email_verification_codes", { _id: record._id }, { used: true, usedAt: new Date() });
	return { success: true, message: "验证码校验通过" };
};

/**
 * 新注册流程：需验证码（可选邀请码）
 * @param email 邮箱
 * @param password 密码
 * @param code 邮箱验证码
 * @param inviteCode 邀请码（当配置启用邀请码时必填）
 */
export const registerUserWithEmail = async (
	email: string,
	password: string,
	code: string,
	inviteCode?: string,
): Promise<{ success: boolean; message: string }> => {
	if (!email || !password || !code) {
		return { success: false, message: "邮箱、密码和验证码不能为空" };
	}
	if (!isPasswordValid(password)) {
		return { success: false, message: "密码不符合要求。密码必须：至少8位字符、包含小写字母、数字和特殊字符" };
	}

	const existing = await db_find(db_name, "users", { email });
	if (existing) {
		return { success: false, message: "该邮箱已注册" };
	}

	// 检查是否需要邀请码
	const inviteRequired = await isInviteCodeRequired();
	if (inviteRequired) {
		if (!inviteCode) {
			return { success: false, message: "当前注册需要邀请码" };
		}
		const inviteValidation = await validateInviteCode(inviteCode);
		if (!inviteValidation.success) {
			return inviteValidation;
		}
	}

	const verify = await VerifyEmailCode(email, code, "register");
	if (!verify.success) {
		return verify;
	}

	const { success, uid } = await registerUser(email, password);
	if (!success || !uid) {
		return { success: false, message: "注册失败，请重试" };
	}

	// 如果使用了邀请码，标记为已使用
	if (inviteRequired && inviteCode) {
		await consumeInviteCode(inviteCode, uid);
	}

	return { success: true, message: "注册成功，请登录" };
};

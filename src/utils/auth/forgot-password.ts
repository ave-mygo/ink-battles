"use server";

import bcryptjs from "bcryptjs";
import { db_name } from "@/lib/constants";
import { db_find, db_update } from "@/lib/db";
import { isPasswordValid } from "@/lib/password-strength";
import { SendVerificationEmail, VerifyEmailCode } from "../common/mail";
import "server-only";

/**
 * 发送密码重置验证码
 */
export async function sendResetPasswordCode(email: string) {
	try {
		// 验证邮箱格式
		const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/u;
		if (!email || !emailRegex.test(email)) {
			return { success: false, message: "请输入有效的邮箱地址" };
		}

		// 检查用户是否存在
		const user = await db_find(db_name, "users", { email });
		if (!user) {
			return { success: false, message: "该邮箱未注册" };
		}

		// 发送验证码
		const result = await SendVerificationEmail(email, "reset-password");
		if (!result.success) {
			return { success: false, message: result.message || "发送失败" };
		}

		return { success: true, message: "验证码已发送" };
	} catch (error) {
		console.error("发送重置密码验证码失败:", error);
		return { success: false, message: "发送失败，请稍后再试" };
	}
}

/**
 * 验证密码重置验证码
 */
export async function verifyResetPasswordCode(email: string, code: string) {
	try {
		if (!email || !code) {
			return { success: false, message: "请提供邮箱和验证码" };
		}

		// 验证验证码
		const result = await VerifyEmailCode(email, code, "reset-password");
		if (!result.success) {
			return { success: false, message: result.message || "验证失败" };
		}

		return { success: true, message: "验证码正确" };
	} catch (error) {
		console.error("验证重置密码验证码失败:", error);
		return { success: false, message: "验证失败，请稍后再试" };
	}
}

/**
 * 重置密码
 */
export async function resetPassword(email: string, code: string, password: string) {
	try {
		if (!email || !code || !password) {
			return { success: false, message: "请提供完整信息" };
		}

		// 验证验证码
		const verifyResult = await VerifyEmailCode(email, code, "reset-password");
		if (!verifyResult.success) {
			return { success: false, message: "验证码无效或已过期" };
		}

		// 验证密码强度
		if (!isPasswordValid(password)) {
			return {
				success: false,
				message: "密码至少 8 位，且包含大写、小写、数字、特殊字符中的任意 2 种",
			};
		}

		// 检查用户是否存在
		const user = await db_find(db_name, "users", { email });
		if (!user) {
			return { success: false, message: "用户不存在" };
		}

		// 加密新密码
		const salt = await bcryptjs.genSalt(10);
		const passwordHash = await bcryptjs.hash(password, salt);

		// 更新密码
		const updateResult = await db_update(
			db_name,
			"users",
			{ email },
			{ passwordHash },
		);

		if (!updateResult) {
			return { success: false, message: "密码更新失败" };
		}

		return { success: true, message: "密码重置成功" };
	} catch (error) {
		console.error("重置密码失败:", error);
		return { success: false, message: "重置失败，请稍后再试" };
	}
}

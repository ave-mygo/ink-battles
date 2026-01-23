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
		// 类型校验
		const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

		// 验证邮箱格式
		const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/u;
		if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
			return { success: false, message: "请输入有效的邮箱地址" };
		}

		// 检查用户是否存在
		const user = await db_find(db_name, "users", { email: normalizedEmail });

		// 无论用户是否存在，都返回相同的消息（防止账户枚举）
		// 只有用户存在时才真正发送验证码
		if (user) {
			const result = await SendVerificationEmail(normalizedEmail, "reset-password");
			if (!result.success) {
				return { success: false, message: result.message || "发送失败，请稍后再试" };
			}
		}

		// 统一返回消息（即使用户不存在也返回相同消息）
		return { success: true, message: "如果该邮箱已注册，您将收到重置密码的验证码" };
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
		// 类型校验
		const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
		const normalizedCode = typeof code === "string" ? code : "";
		const normalizedPassword = typeof password === "string" ? password : "";

		if (!normalizedEmail || !normalizedCode || !normalizedPassword) {
			return { success: false, message: "请提供完整信息" };
		}

		// 验证验证码
		const verifyResult = await VerifyEmailCode(normalizedEmail, normalizedCode, "reset-password");
		if (!verifyResult.success) {
			return { success: false, message: "验证码无效或已过期" };
		}

		// 验证密码强度
		if (!isPasswordValid(normalizedPassword)) {
			return {
				success: false,
				message: "密码至少 8 位，且包含大写、小写、数字、特殊字符中的任意 2 种",
			};
		}

		// 检查用户是否存在
		const user = await db_find(db_name, "users", { email: normalizedEmail });
		if (!user) {
			// 验证码正确但用户不存在（异常情况），返回通用错误
			return { success: false, message: "重置密码失败，请重新申请验证码" };
		}

		// 加密新密码
		const salt = await bcryptjs.genSalt(10);
		const passwordHash = await bcryptjs.hash(normalizedPassword, salt);

		// 更新密码
		const updateResult = await db_update(
			db_name,
			"users",
			{ email: normalizedEmail },
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

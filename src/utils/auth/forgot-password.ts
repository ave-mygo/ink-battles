"use client";

import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";

export async function sendResetPasswordCode(email: string) {
	const { data, error } = await createClientEden().api.v2.rpc["auth.sendPasswordResetCode"].post({ email });
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "发送失败");
}

export async function verifyResetPasswordCode(email: string, code: string) {
	const { data, error } = await createClientEden().api.v2.rpc["auth.verifyPasswordResetCode"].post({ email, code });
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "校验失败");
}

export async function resetPassword(email: string, code: string, password: string) {
	const { data, error } = await createClientEden().api.v2.rpc["auth.resetPassword"].post({ email, code, password });
	return normalizeEdenResult<{ success: boolean; message: string }>(data, error, "重置失败");
}

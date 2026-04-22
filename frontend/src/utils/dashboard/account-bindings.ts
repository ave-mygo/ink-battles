"use client";

import type { AccountBindingsDetails } from "@ink-battles/shared/types/common/accounts";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult, unwrapEdenPayload } from "@/utils/api/eden-response";

export const bindEmailAccount = async (email: string, code: string, password: string) =>
	normalizeEdenResult<{ success: boolean; message: string }>(
		...(await (async () => {
			const response = await createClientEden().api.v2.rpc["accounts.bindEmail"].post({ email, code, password });
			return [response.data, response.error] as const;
		})()),
		"绑定邮箱失败",
	);

export const unbindEmailAccount = async () =>
	normalizeEdenResult<{ success: boolean; message: string }>(
		...(await (async () => {
			const response = await createClientEden().api.v2.rpc["accounts.unbindEmail"].post();
			return [response.data, response.error] as const;
		})()),
		"解绑邮箱失败",
	);

export const unbindQQAccount = async () =>
	normalizeEdenResult<{ success: boolean; message: string }>(
		...(await (async () => {
			const response = await createClientEden().api.v2.rpc["accounts.unbindQQ"].post();
			return [response.data, response.error] as const;
		})()),
		"解绑 QQ 失败",
	);

export const unbindAfdianAccount = async () =>
	normalizeEdenResult<{ success: boolean; message: string }>(
		...(await (async () => {
			const response = await createClientEden().api.v2.rpc["accounts.unbindAfdian"].post();
			return [response.data, response.error] as const;
		})()),
		"解绑爱发电失败",
	);

export const getAccountBindingDetails = async () =>
	unwrapEdenPayload<AccountBindingsDetails>(
		...(await (async () => {
			const response = await createClientEden().api.v2.accounts.details.get();
			return [
				response.data,
				response.error,
				{ email: { bound: false }, qq: { bound: false }, afdian: { bound: false }, loginMethod: null },
			] as const;
		})()),
	);

"use client";

import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";

export const BILLING_BALANCE_UPDATED_EVENT = "ink_battles_billing_balance_updated";
const AVAILABLE_CALLS_CACHE_TTL_MS = 1_000;
const BILLING_UPDATE_EVENT_DEBOUNCE_MS = 100;

export interface SerializedUserBilling {
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	lastGrantRefresh: string;
	createdAt: string;
	updatedAt: string;
}

interface AvailableCallsResult {
	success: boolean;
	data?: { grantCalls: number; paidCalls: number; totalCalls: number };
	message?: string;
}

let availableCallsCache: { value: AvailableCallsResult; expiresAt: number } | null = null;
let availableCallsRequest: Promise<AvailableCallsResult> | null = null;
let billingUpdateEventTimer: ReturnType<typeof setTimeout> | null = null;

export async function getBillingInfo() {
	const response = await createClientEden().api.v2.billing.summary.get();
	return normalizeEdenResult<{
		success: boolean;
		data?: {
			billing: SerializedUserBilling;
			memberTier: string;
			memberName: string;
			discount: number;
			paidCallPrice: number;
		};
		message?: string;
	}>(response.data, response.error, "加载计费信息失败");
}

export async function redeemOrder(orderNo: string) {
	const response = await createClientEden().api.v2.rpc["billing.redeemOrder"].post({ orderNo });
	return normalizeEdenResult<{ success: boolean; message: string }>(response.data, response.error, "兑换失败");
}

export async function getAvailableCalls(options: { force?: boolean } = {}) {
	if (!options.force && availableCallsCache && availableCallsCache.expiresAt > Date.now()) {
		return availableCallsCache.value;
	}

	if (!options.force && availableCallsRequest) {
		return availableCallsRequest;
	}

	availableCallsRequest = createClientEden().api.v2.billing["available-calls"].get().then(response => normalizeEdenResult<AvailableCallsResult>(response.data, response.error, "加载可用次数失败")).then((result) => {
		if (result.success) {
			availableCallsCache = {
				value: result,
				expiresAt: Date.now() + AVAILABLE_CALLS_CACHE_TTL_MS,
			};
		}
		return result;
	}).finally(() => {
		availableCallsRequest = null;
	});

	return availableCallsRequest;
}

/**
 * 通知前端重新拉取次数余额。
 */
export const notifyBillingBalanceUpdated = () => {
	if (typeof window !== "undefined") {
		availableCallsCache = null;
		if (billingUpdateEventTimer) {
			clearTimeout(billingUpdateEventTimer);
		}
		billingUpdateEventTimer = setTimeout(() => {
			window.dispatchEvent(new Event(BILLING_BALANCE_UPDATED_EVENT));
			billingUpdateEventTimer = null;
		}, BILLING_UPDATE_EVENT_DEBOUNCE_MS);
	}
};

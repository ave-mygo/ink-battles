"use server";

import type { BillingService } from "@/types/services/billing";

import {
	getUserBillingDetails,
	purchaseCalls,
	updateMonthlyGrantByTotalAmount,
} from "@/lib/billing";

import "server-only";

class BillingServiceImpl implements BillingService {
	async getUserBillingInfo(userEmail: string) {
		return await getUserBillingDetails(userEmail);
	}

	async processDonation(userEmail: string, totalAmount: number, _orderId: string): Promise<void> {
		// 基于累计总额更新月度赠送
		await updateMonthlyGrantByTotalAmount(userEmail, totalAmount);
	}

	async processCallPurchase(userEmail: string, calls: number): Promise<{ success: boolean; cost: number; orderId: string }> {
		const billingDetails = await getUserBillingDetails(userEmail);
		const totalCost = billingDetails.callPrice * calls;

		const orderId = `CALL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		try {
			await purchaseCalls(userEmail, calls, totalCost, orderId);
			return { success: true, cost: totalCost, orderId };
		} catch (error) {
			console.error("购买调用次数失败:", error);
			return { success: false, cost: totalCost, orderId };
		}
	}

	async calculateCallCost(userEmail: string, calls: number): Promise<number> {
		const billingDetails = await getUserBillingDetails(userEmail);
		return billingDetails.callPrice * calls;
	}

	async getMembershipInfo(userEmail: string) {
		const billingDetails = await getUserBillingDetails(userEmail);

		return {
			tier: billingDetails.tierInfo,
			totalSpent: billingDetails.billing.totalSpent,
			monthlyDonation: billingDetails.monthlyDonation,
			grantCallsRemaining: billingDetails.billing.grantCallsRemaining,
			paidCallsRemaining: billingDetails.billing.paidCallsRemaining,
			callPrice: billingDetails.callPrice,
			monthlyGrantCalls: billingDetails.monthlyGrantCalls,
		};
	}
}

export const billingService = new BillingServiceImpl();

export async function calculateBulkPurchaseCost(userEmail: string, calls: number): Promise<{
	unitPrice: number;
	totalCost: number;
	discount: number;
	tierInfo: any;
}> {
	const billingDetails = await getUserBillingDetails(userEmail);
	const tierInfo = billingDetails.tierInfo;

	return {
		unitPrice: billingDetails.callPrice,
		totalCost: billingDetails.callPrice * calls,
		discount: tierInfo.discount,
		tierInfo,
	};
}

export async function getMonthlyGrantProgress(userEmail: string): Promise<{
	currentDonation: number;
	currentGrants: number;
	nextThreshold: number | null;
	additionalGrants: number;
}> {
	const billingDetails = await getUserBillingDetails(userEmail);
	const { monthlyDonation, monthlyGrantCalls } = billingDetails;

	const GRANT_CALL_VIRTUAL_COST = 1.2;
	const MONTHLY_GRANT_MAX = 80;

	let nextThreshold = null;
	let additionalGrants = 0;

	if (monthlyGrantCalls < MONTHLY_GRANT_MAX) {
		const remainingGrants = MONTHLY_GRANT_MAX - monthlyGrantCalls;
		nextThreshold = Math.ceil(remainingGrants * GRANT_CALL_VIRTUAL_COST);
		additionalGrants = Math.floor(nextThreshold / GRANT_CALL_VIRTUAL_COST);
	}

	return {
		currentDonation: monthlyDonation,
		currentGrants: monthlyGrantCalls,
		nextThreshold,
		additionalGrants,
	};
}

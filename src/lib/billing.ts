"use server";

import type {
	UserBilling,
} from "@/types/billing/usage";
import {
	calculateMonthlyGrantCalls,
	calculatePaidCallPrice,
	db_name,
	getMemberTier,
	MONTHLY_GRANT_BASE,
} from "@/lib/constants";
import { db_find, db_insert, db_update, mongoClient } from "@/lib/db";

import "server-only";

// 导出类型，保持向后兼容
export type {
	CallTransaction,
	MonthlyGrant,
	UserBilling,
} from "@/types/billing/usage";

/**
 * 获取或创建用户计费信息
 */
export async function getUserBilling(userEmail: string): Promise<UserBilling> {
	let billing = await db_find(db_name, "user_billing", { userEmail });

	if (!billing) {
		const newBilling: UserBilling = {
			userEmail,
			totalSpent: 0,
			monthlyDonation: 0,
			grantCallsRemaining: MONTHLY_GRANT_BASE,
			paidCallsRemaining: 0,
			lastGrantUpdate: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await db_insert(db_name, "user_billing", newBilling);
		billing = newBilling;
	}

	return billing;
}

/**
 * 更新用户月度赠送调用次数
 */
export async function updateMonthlyGrant(userEmail: string, donationAmount: number): Promise<void> {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;

	const existingGrant = await db_find(db_name, "monthly_grants", { userEmail, year, month });

	if (existingGrant) {
		const totalDonation = existingGrant.donationAmount + donationAmount;
		const newGrantCalls = calculateMonthlyGrantCalls(totalDonation);
		const additionalCalls = newGrantCalls - existingGrant.grantedCalls;

		await db_update(db_name, "monthly_grants", { userEmail, year, month }, {
			donationAmount: totalDonation,
			grantedCalls: newGrantCalls,
		});

		if (additionalCalls > 0) {
			await addGrantCalls(userEmail, additionalCalls, `${year}年${month}月额外赠送`);
		}
	} else {
		const grantCalls = calculateMonthlyGrantCalls(donationAmount);

		await db_insert(db_name, "monthly_grants", {
			userEmail,
			year,
			month,
			donationAmount,
			grantedCalls: grantCalls,
			createdAt: now,
		});

		await addGrantCalls(userEmail, grantCalls - MONTHLY_GRANT_BASE, `${year}年${month}月捐赠赠送`);
	}
}

/**
 * 基于累计总额更新用户月度赠送调用次数
 */
export async function updateMonthlyGrantByTotalAmount(userEmail: string, totalAmount: number): Promise<void> {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;

	// 根据累计总额计算应得的月度赠送次数
	const grantCalls = calculateMonthlyGrantCalls(totalAmount);

	// 检查是否有当月记录
	const existingGrant = await db_find(db_name, "monthly_grants", { userEmail, year, month });

	if (existingGrant) {
		// 更新现有记录
		await db_update(db_name, "monthly_grants", { userEmail, year, month }, {
			donationAmount: totalAmount, // 记录累计总额
			grantedCalls: grantCalls,
		});
	} else {
		// 创建新记录
		await db_insert(db_name, "monthly_grants", {
			userEmail,
			year,
			month,
			donationAmount: totalAmount,
			grantedCalls: grantCalls,
			createdAt: now,
		});
	}

	// 更新用户的实际余额
	await db_update(db_name, "user_billing", { userEmail }, {
		grantCallsRemaining: grantCalls,
		updatedAt: now,
	});
}

/**
 * 增加赠送调用次数
 */
export async function addGrantCalls(userEmail: string, calls: number, description: string): Promise<void> {
	const billing = await getUserBilling(userEmail);

	await db_update(db_name, "user_billing", { userEmail }, {
		grantCallsRemaining: billing.grantCallsRemaining + calls,
		updatedAt: new Date(),
	});

	await db_insert(db_name, "call_transactions", {
		userEmail,
		type: "grant",
		amount: calls,
		description,
		timestamp: new Date(),
	});
}

/**
 * 购买付费调用次数
 */
export async function purchaseCalls(userEmail: string, calls: number, paymentAmount: number, orderId: string): Promise<void> {
	const billing = await getUserBilling(userEmail);

	await db_update(db_name, "user_billing", { userEmail }, {
		totalSpent: billing.totalSpent + paymentAmount,
		paidCallsRemaining: billing.paidCallsRemaining + calls,
		updatedAt: new Date(),
	});

	await db_insert(db_name, "call_transactions", {
		userEmail,
		type: "purchase",
		amount: calls,
		description: `购买${calls}次高级模型调用`,
		relatedOrderId: orderId,
		timestamp: new Date(),
	});
}

/**
 * 消耗调用次数
 */
export async function consumeCall(userEmail: string): Promise<{ success: boolean; callType: "grant" | "paid" | "none" }> {
	const billing = await getUserBilling(userEmail);

	if (billing.grantCallsRemaining > 0) {
		await db_update(db_name, "user_billing", { userEmail }, {
			grantCallsRemaining: billing.grantCallsRemaining - 1,
			updatedAt: new Date(),
		});

		await db_insert(db_name, "call_transactions", {
			userEmail,
			type: "usage",
			amount: -1,
			description: "使用赠送调用次数",
			timestamp: new Date(),
		});

		return { success: true, callType: "grant" };
	}

	if (billing.paidCallsRemaining > 0) {
		await db_update(db_name, "user_billing", { userEmail }, {
			paidCallsRemaining: billing.paidCallsRemaining - 1,
			updatedAt: new Date(),
		});

		await db_insert(db_name, "call_transactions", {
			userEmail,
			type: "usage",
			amount: -1,
			description: "使用付费调用次数",
			timestamp: new Date(),
		});

		return { success: true, callType: "paid" };
	}

	return { success: false, callType: "none" };
}

/**
 * 获取用户计费详情
 */
export async function getUserBillingDetails(userEmail: string) {
	const billing = await getUserBilling(userEmail);
	const tierInfo = getMemberTier(billing.totalSpent);
	const callPrice = calculatePaidCallPrice(billing.totalSpent);

	const now = new Date();
	const currentMonthGrant = await db_find(db_name, "monthly_grants", {
		userEmail,
		year: now.getFullYear(),
		month: now.getMonth() + 1,
	});

	return {
		billing,
		tierInfo,
		callPrice,
		monthlyDonation: currentMonthGrant?.donationAmount || 0,
		monthlyGrantCalls: currentMonthGrant?.grantedCalls || MONTHLY_GRANT_BASE,
	};
}

/**
 * 重置每月赠送调用次数（月初执行）
 */
export async function resetMonthlyGrants(): Promise<void> {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;

	const allBillingDocs = await (await mongoClient()).db(db_name).collection("user_billing").find({}).toArray();

	for (const user of allBillingDocs || []) {
		const monthlyGrant = await db_find(db_name, "monthly_grants", {
			userEmail: user.userEmail,
			year,
			month,
		});

		const grantCalls = monthlyGrant?.grantedCalls || MONTHLY_GRANT_BASE;

		await db_update(db_name, "user_billing", { userEmail: user.userEmail }, {
			grantCallsRemaining: grantCalls,
			monthlyDonation: 0,
			lastGrantUpdate: now,
			updatedAt: now,
		});
	}
}

/**
 * 增加付费调用次数
 */
export async function addPaidCalls(userEmail: string, callsToAdd: number, description: string = "订单兑换获得付费调用次数"): Promise<{ success: boolean; newTotal: number }> {
	const billing = await getUserBilling(userEmail);

	const newTotal = billing.paidCallsRemaining + callsToAdd;

	await db_update(db_name, "user_billing", { userEmail }, {
		paidCallsRemaining: newTotal,
		updatedAt: new Date(),
	});

	// 记录交易
	await db_insert(db_name, "call_transactions", {
		userEmail,
		type: "purchase",
		amount: callsToAdd,
		description,
		timestamp: new Date(),
	});

	return { success: true, newTotal };
}

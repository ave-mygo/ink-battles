"use server";

import type { AfdOrder } from "@/types/database/afd_order";
import type { UserBilling } from "@/types/database/user_billing";
import {
	db_collection_afd_orders,
	db_collection_user_billing,
	db_name,
	MONTHLY_GRANT_BASE,
	NEW_USER_BONUS,
} from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";
import { verifyOrderOwnership } from "@/utils/afdian/orders";
import {
	calculateCallsFromOrder,
	calculateMonthlyGrantCalls,
	shouldRefreshGrantCalls,
} from "@/utils/billing/calculations";
import "server-only";

/**
 * 获取用户计费信息
 * @param uid 用户UID
 * @returns 用户计费信息或null
 */
export async function getUserBilling(uid: number): Promise<UserBilling | null> {
	const billing = await db_find(db_name, db_collection_user_billing, { uid });
	return billing as UserBilling | null;
}

/**
 * 初始化新用户计费信息（注册时调用）
 * @param uid 用户UID
 * @returns 是否成功
 */
export async function initializeUserBilling(uid: number): Promise<boolean> {
	// 检查是否已存在
	const existing = await getUserBilling(uid);
	if (existing) {
		return true; // 已存在，不重复创建
	}

	const now = new Date();
	const initialBilling: UserBilling = {
		uid,
		totalAmount: 0,
		grantCallsBalance: MONTHLY_GRANT_BASE, // 初始化直接给当月免费额度
		paidCallsBalance: NEW_USER_BONUS, // 新用户赠送20次
		lastGrantRefresh: now,
		createdAt: now,
		updatedAt: now,
	};

	return await db_insert(db_name, db_collection_user_billing, initialBilling);
}

/**
 * 检查并刷新每月赠送次数
 * @param uid 用户UID
 * @returns 是否进行了刷新
 */
export async function refreshGrantCallsIfNeeded(uid: number): Promise<boolean> {
	const billing = await getUserBilling(uid);
	if (!billing) {
		return false;
	}

	// 检查是否需要刷新
	if (!shouldRefreshGrantCalls(billing.lastGrantRefresh)) {
		return false; // 不需要刷新
	}

	// 计算新的每月赠送次数
	const newGrantCalls = calculateMonthlyGrantCalls(billing.totalAmount);
	const now = new Date();

	// 更新数据库
	await db_update(
		db_name,
		db_collection_user_billing,
		{ uid },
		{
			grantCallsBalance: newGrantCalls,
			lastGrantRefresh: now,
			updatedAt: now,
		},
	);

	return true;
}

/**
 * 扣减调用次数（优先使用赠送次数）
 * @param uid 用户UID
 * @returns 是否成功扣减
 */
export async function deductCallBalance(uid: number): Promise<boolean> {
	// 先刷新赠送次数（如果需要）
	await refreshGrantCallsIfNeeded(uid);

	const billing = await getUserBilling(uid);
	if (!billing) {
		return false;
	}

	const now = new Date();

	// 优先扣减赠送次数
	if (billing.grantCallsBalance > 0) {
		await db_update(
			db_name,
			db_collection_user_billing,
			{ uid },
			{
				grantCallsBalance: billing.grantCallsBalance - 1,
				updatedAt: now,
			},
		);
		return true;
	}

	// 其次扣减付费次数
	if (billing.paidCallsBalance > 0) {
		await db_update(
			db_name,
			db_collection_user_billing,
			{ uid },
			{
				paidCallsBalance: billing.paidCallsBalance - 1,
				updatedAt: now,
			},
		);
		return true;
	}

	// 没有可用次数
	return false;
}

/**
 * 兑换订单
 * @param uid 用户UID
 * @param afdId 用户的爱发电ID
 * @param orderNo 订单号
 * @returns 兑换结果
 */
export async function redeemOrder(
	uid: number,
	afdId: string,
	orderNo: string,
): Promise<{ success: boolean; message: string }> {
	try {
		// 1. 检查订单是否已被兑换
		const existingOrder = await db_find(db_name, db_collection_afd_orders, { orderNo });
		if (existingOrder) {
			return { success: false, message: "该订单已被兑换，请勿重复使用" };
		}

		// 2. 验证订单所有权
		const verification = await verifyOrderOwnership(orderNo, afdId);
		if (!verification.valid) {
			return { success: false, message: verification.message };
		}

		const orderAmount = verification.amount!;

		// 3. 获取用户当前计费信息
		const billing = await getUserBilling(uid);
		if (!billing) {
			return { success: false, message: "用户计费信息不存在" };
		}

		// 4. 计算本次兑换增加的次数
		const { grantCallsAdded, paidCallsAdded } = calculateCallsFromOrder(
			orderAmount,
			billing.totalAmount,
		);

		// 5. 更新用户计费信息
		const now = new Date();
		const newTotalAmount = billing.totalAmount + orderAmount;
		const newGrantCallsBalance = billing.grantCallsBalance + grantCallsAdded;
		const newPaidCallsBalance = billing.paidCallsBalance + paidCallsAdded;

		await db_update(
			db_name,
			db_collection_user_billing,
			{ uid },
			{
				totalAmount: newTotalAmount,
				grantCallsBalance: newGrantCallsBalance,
				paidCallsBalance: newPaidCallsBalance,
				updatedAt: now,
			},
		);

		// 6. 记录订单兑换信息
		const orderRecord: AfdOrder = {
			orderNo,
			uid,
			afdId,
			amount: orderAmount,
			redeemedAt: now,
			grantCallsAdded,
			paidCallsAdded,
		};
		await db_insert(db_name, db_collection_afd_orders, orderRecord);

		return {
			success: true,
			message: `兑换成功！累计消费：¥${newTotalAmount.toFixed(2)}，本次获得：赠送次数+${grantCallsAdded}，付费次数+${paidCallsAdded}`,
		};
	} catch (error) {
		return {
			success: false,
			message: `兑换失败: ${error instanceof Error ? error.message : "未知错误"}`,
		};
	}
}

/**
 * 检查用户是否有可用的调用次数
 * @param uid 用户UID
 * @returns 是否有可用次数
 */
export async function hasAvailableCalls(uid: number): Promise<boolean> {
	// 先刷新赠送次数（如果需要）
	await refreshGrantCallsIfNeeded(uid);

	const billing = await getUserBilling(uid);
	if (!billing) {
		return false;
	}

	return billing.grantCallsBalance > 0 || billing.paidCallsBalance > 0;
}

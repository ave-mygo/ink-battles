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
import { db_find, db_findOneAndUpdate, db_insert, db_update, db_withTransaction, ensureUniqueIndex } from "@/lib/db";
import { verifyOrderOwnership } from "@/utils/afdian/orders";
import {
	calculateMonthlyGrantCalls,
	calculatePaidCallPrice,
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
		grantCallsBalance: 0, // 未兑换过订单的用户不赠送每月次数
		paidCallsBalance: NEW_USER_BONUS, // 新用户赠送次数
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

	// 未兑换过订单的用户（totalAmount === 0）不赠送每月次数
	const newGrantCalls = billing.totalAmount > 0 ? calculateMonthlyGrantCalls(billing.totalAmount) : 0;
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
 * 原子性扣减调用次数（优先使用赠送次数）
 * 使用 findOneAndUpdate + $inc 原子操作，避免并发竞态导致的多扣/少扣
 * @param uid 用户UID
 * @returns 是否成功扣减
 */
export async function deductCallBalance(uid: number): Promise<boolean> {
	// 先刷新赠送次数（如果需要）
	await refreshGrantCallsIfNeeded(uid);

	const now = new Date();

	// 优先原子性扣减赠送次数：条件 grantCallsBalance > 0 + $inc: -1
	const grantResult = await db_findOneAndUpdate(
		db_name,
		db_collection_user_billing,
		{ uid, grantCallsBalance: { $gt: 0 } },
		{ $inc: { grantCallsBalance: -1 }, $set: { updatedAt: now } },
	);

	if (grantResult) {
		return true;
	}

	// 其次原子性扣减付费次数：条件 paidCallsBalance > 0 + $inc: -1
	const paidResult = await db_findOneAndUpdate(
		db_name,
		db_collection_user_billing,
		{ uid, paidCallsBalance: { $gt: 0 } },
		{ $inc: { paidCallsBalance: -1 }, $set: { updatedAt: now } },
	);

	if (paidResult) {
		return true;
	}

	// 没有可用次数
	return false;
}

/**
 * 原子性退还一次调用次数（退还到付费次数）
 * 用于预扣费模式下任务失败时退还费用
 * @param uid 用户UID
 * @returns 是否成功退还
 */
export async function refundCallBalance(uid: number): Promise<boolean> {
	const now = new Date();

	// 退还到付费次数（原子操作）
	const result = await db_findOneAndUpdate(
		db_name,
		db_collection_user_billing,
		{ uid },
		{ $inc: { paidCallsBalance: 1 }, $set: { updatedAt: now } },
	);

	return !!result;
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
		// 0. 确保 orderNo 唯一索引存在（数据库层面防止并发重复兑换）
		await ensureUniqueIndex(db_name, db_collection_afd_orders, "orderNo");

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
		const isFirstRedemption = billing.totalAmount === 0;

		// 付费次数：订单金额除以当前折扣后的单价
		const paidCallPrice = calculatePaidCallPrice(billing.totalAmount);
		const paidCallsAdded = Math.floor(orderAmount / paidCallPrice);

		// 赠送次数：仅首次兑换时一次性补发当月赠送额度，后续兑换不再变更赠送次数
		const grantCallsAdded = isFirstRedemption ? MONTHLY_GRANT_BASE : 0;

		// 5. 计算新值
		const now = new Date();
		const newTotalAmount = billing.totalAmount + orderAmount;
		const newGrantCallsBalance = billing.grantCallsBalance + grantCallsAdded;
		const newPaidCallsBalance = billing.paidCallsBalance + paidCallsAdded;

		// 6. 在事务中执行：更新余额 + 插入订单记录（保证原子性）
		await db_withTransaction(async (session) => {
			// 更新用户计费信息
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
				true,
				session,
			);

			// 记录订单兑换信息
			const orderRecord: AfdOrder = {
				orderNo,
				uid,
				afdId,
				amount: orderAmount,
				redeemedAt: now,
				grantCallsAdded,
				paidCallsAdded,
			};
			await db_insert(db_name, db_collection_afd_orders, orderRecord, true, session);
		});

		const messageParts = [`兑换成功！累计消费：¥${newTotalAmount.toFixed(2)}，付费次数+${paidCallsAdded}`];
		if (isFirstRedemption) {
			messageParts.push(`（首次兑换，补发当月赠送次数+${grantCallsAdded}）`);
		}

		return {
			success: true,
			message: messageParts.join(""),
		};
	} catch (error) {
		// 识别唯一索引冲突错误（并发兑换场景下的安全网）
		const errMsg = error instanceof Error ? error.message : "未知错误";
		if (errMsg.includes("E11000") || errMsg.includes("duplicate key")) {
			return { success: false, message: "该订单已被兑换，请勿重复使用" };
		}
		return {
			success: false,
			message: `兑换失败: ${errMsg}`,
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

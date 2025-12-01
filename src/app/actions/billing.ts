"use server";

import { getCurrentUserInfo } from "@/utils/auth/server";
import { calculatePaidCallPrice, getMemberTierInfo } from "@/utils/billing/calculations";
import {
	getUserBilling,
	initializeUserBilling,
	redeemOrder as redeemOrderUtil,
	refreshGrantCallsIfNeeded,
} from "@/utils/billing/server";

/**
 * 序列化后的用户计费信息（用于客户端传递）
 */
interface SerializedUserBilling {
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	lastGrantRefresh: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * 获取用户计费信息（供客户端调用）
 * @returns 计费信息或错误
 */
export async function getBillingInfo(): Promise<{
	success: boolean;
	data?: {
		billing: SerializedUserBilling;
		memberTier: string;
		memberName: string;
		discount: number;
		paidCallPrice: number;
	};
	message?: string;
}> {
	const user = await getCurrentUserInfo();
	if (!user) {
		return { success: false, message: "未登录" };
	}

	// 刷新赠送次数（如果需要）
	await refreshGrantCallsIfNeeded(user.uid);

	let billing = await getUserBilling(user.uid);

	// 如果计费信息不存在（老用户），自动初始化
	if (!billing) {
		const initialized = await initializeUserBilling(user.uid);
		if (!initialized) {
			return { success: false, message: "初始化计费信息失败" };
		}
		billing = await getUserBilling(user.uid);
		if (!billing) {
			return { success: false, message: "计费信息不存在" };
		}
	}

	const tierInfo = getMemberTierInfo(billing.totalAmount);
	const paidCallPrice = calculatePaidCallPrice(billing.totalAmount);

	// 将 MongoDB 对象转换为纯对象（去除 _id 和转换 Date 类型）
	const serializedBilling: SerializedUserBilling = {
		uid: billing.uid,
		totalAmount: billing.totalAmount,
		grantCallsBalance: billing.grantCallsBalance,
		paidCallsBalance: billing.paidCallsBalance,
		lastGrantRefresh: billing.lastGrantRefresh.toISOString(),
		createdAt: billing.createdAt.toISOString(),
		updatedAt: billing.updatedAt.toISOString(),
	};

	return {
		success: true,
		data: {
			billing: serializedBilling,
			memberTier: tierInfo.tier,
			memberName: tierInfo.name,
			discount: tierInfo.discount,
			paidCallPrice,
		},
	};
}

/**
 * 兑换订单
 * @param orderNo 订单号
 * @returns 兑换结果
 */
export async function redeemOrderAction(orderNo: string): Promise<{
	success: boolean;
	message: string;
}> {
	const user = await getCurrentUserInfo();
	if (!user) {
		return { success: false, message: "未登录" };
	}

	if (!user.afdId) {
		return { success: false, message: "请先绑定爱发电账户" };
	}

	if (!orderNo || orderNo.trim() === "") {
		return { success: false, message: "请输入订单号" };
	}

	return await redeemOrderUtil(user.uid, user.afdId, orderNo.trim());
}

/**
 * 获取可用调用次数统计
 * @returns 可用次数信息
 */
export async function getAvailableCalls(): Promise<{
	success: boolean;
	data?: {
		grantCalls: number;
		paidCalls: number;
		totalCalls: number;
	};
	message?: string;
}> {
	const user = await getCurrentUserInfo();
	if (!user) {
		return { success: false, message: "未登录" };
	}

	// 刷新赠送次数（如果需要）
	await refreshGrantCallsIfNeeded(user.uid);

	let billing = await getUserBilling(user.uid);

	// 如果计费信息不存在（老用户），自动初始化
	if (!billing) {
		const initialized = await initializeUserBilling(user.uid);
		if (!initialized) {
			return { success: false, message: "初始化计费信息失败" };
		}
		billing = await getUserBilling(user.uid);
		if (!billing) {
			return { success: false, message: "计费信息不存在" };
		}
	}

	return {
		success: true,
		data: {
			grantCalls: billing.grantCallsBalance,
			paidCalls: billing.paidCallsBalance,
			totalCalls: billing.grantCallsBalance + billing.paidCallsBalance,
		},
	};
}

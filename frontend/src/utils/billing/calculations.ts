import type { MemberTier } from "@/lib/constants";
import {
	calculateMonthlyGrantCalls as calculateMonthlyGrantCallsByBillingPlan,
	calculatePaidCallPrice as calculatePaidCallPriceByBillingPlan,
	getBillingTierInfo,
	shouldRefreshGrantCalls,
} from "@ink-battles/shared/constants/billing";

/**
 * 计算每月赠送调用次数
 * @param totalAmount 累计消费总额（人民币）
 * @returns 每月赠送调用次数
 */
export function calculateMonthlyGrantCalls(totalAmount: number): number {
	return calculateMonthlyGrantCallsByBillingPlan(totalAmount);
}

/**
 * 计算付费购买单次调用价格
 * @param totalAmount 累计消费总额（人民币）
 * @returns 单次调用价格（人民币）
 */
export function calculatePaidCallPrice(totalAmount: number): number {
	return calculatePaidCallPriceByBillingPlan(totalAmount);
}

/**
 * 获取会员等级信息
 * @param totalAmount 累计消费总额（人民币）
 * @returns 会员等级和折扣信息
 */
export function getMemberTierInfo(totalAmount: number): {
	tier: MemberTier;
	name: string;
	discount: number;
} {
	const tierInfo = getBillingTierInfo(totalAmount);
	return {
		tier: tierInfo.tier as MemberTier,
		name: tierInfo.name,
		discount: tierInfo.discount,
	};
}

/**
 * 根据订单金额计算赠送和付费次数
 * 注意：这里不直接计算，而是返回订单金额，由服务器端根据当前累计金额计算
 * @param orderAmount 订单金额（人民币）
 * @param currentTotalAmount 当前累计消费总额（人民币）
 * @returns 本次订单应增加的赠送和付费次数
 */
export function calculateCallsFromOrder(
	orderAmount: number,
	currentTotalAmount: number,
): {
	grantCallsAdded: number;
	paidCallsAdded: number;
} {
	// 新的累计金额
	const newTotalAmount = currentTotalAmount + orderAmount;

	// 计算新的每月赠送次数（这个会在下次刷新时生效）
	const newGrantCalls = calculateMonthlyGrantCalls(newTotalAmount);
	const oldGrantCalls = calculateMonthlyGrantCalls(currentTotalAmount);
	const grantCallsAdded = newGrantCalls - oldGrantCalls;

	// 付费次数：订单金额除以当前折扣后的单价
	const paidCallPrice = calculatePaidCallPrice(currentTotalAmount);
	const paidCallsAdded = Math.floor(orderAmount / paidCallPrice);

	return {
		grantCallsAdded,
		paidCallsAdded,
	};
}

/**
 * 判断是否需要刷新每月赠送次数
 * @param lastRefresh 上次刷新时间
 * @returns 是否需要刷新
 */
export { shouldRefreshGrantCalls };

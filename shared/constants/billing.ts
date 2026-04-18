export const BILLING_CONSTANTS = {
	ADVANCED_MODEL_BASE_COST: 0.3,
	GRANT_CALL_VIRTUAL_COST: 1.2,
	MONTHLY_GRANT_BASE: 5,
	MONTHLY_GRANT_MAX: 35,
	NEW_USER_BONUS: 25,
} as const;

export const BILLING_MEMBER_TIERS = {
	REGULAR: { minAmount: 0, maxAmount: 50, discount: 0, name: "普通会员" },
	BRONZE: { minAmount: 50, maxAmount: 150, discount: 0.05, name: "铜牌会员" },
	SILVER: { minAmount: 150, maxAmount: 300, discount: 0.1, name: "银牌会员" },
	GOLD: { minAmount: 300, maxAmount: 460, discount: 0.15, name: "金牌会员" },
	DIAMOND: { minAmount: 460, maxAmount: Infinity, discount: 0.2, name: "钻石会员" },
} as const;

export type BillingMemberTier = keyof typeof BILLING_MEMBER_TIERS;

export interface BillingTierInfo {
	tier: BillingMemberTier;
	name: string;
	discount: number;
}

/**
 * 根据累计消费计算会员等级信息。
 */
export function getBillingTierInfo(totalAmount: number): BillingTierInfo {
	for (const [tier, config] of Object.entries(BILLING_MEMBER_TIERS)) {
		if (totalAmount >= config.minAmount && totalAmount < config.maxAmount) {
			return {
				tier: tier as BillingMemberTier,
				name: config.name,
				discount: config.discount,
			};
		}
	}

	return {
		tier: "REGULAR",
		name: BILLING_MEMBER_TIERS.REGULAR.name,
		discount: BILLING_MEMBER_TIERS.REGULAR.discount,
	};
}

/**
 * 每月赠送次数按累计消费动态增长，并受上限限制。
 */
export function calculateMonthlyGrantCalls(totalAmount: number): number {
	const calculated = BILLING_CONSTANTS.MONTHLY_GRANT_BASE
		+ Math.floor(totalAmount / BILLING_CONSTANTS.GRANT_CALL_VIRTUAL_COST);

	return Math.min(calculated, BILLING_CONSTANTS.MONTHLY_GRANT_MAX);
}

/**
 * 付费单次调用价格会随会员等级折扣下降。
 */
export function calculatePaidCallPrice(totalAmount: number): number {
	const tierInfo = getBillingTierInfo(totalAmount);
	return BILLING_CONSTANTS.ADVANCED_MODEL_BASE_COST * (1 - tierInfo.discount);
}

/**
 * 订单兑换时，付费次数按照当前累计消费下的单价计算。
 */
export function calculatePaidCallsFromOrder(orderAmount: number, currentTotalAmount: number): number {
	return Math.floor(orderAmount / calculatePaidCallPrice(currentTotalAmount));
}

/**
 * 首次兑换时补发当前月保底赠送额度。
 */
export function calculateInitialGrantCalls(totalAmount: number): number {
	return totalAmount === 0 ? BILLING_CONSTANTS.MONTHLY_GRANT_BASE : 0;
}

/**
 * 是否需要在读取账单时刷新月赠送额度。
 */
export function shouldRefreshGrantCalls(lastRefresh: Date): boolean {
	const now = new Date();
	const lastRefreshDate = new Date(lastRefresh);

	return now.getFullYear() !== lastRefreshDate.getFullYear()
		|| now.getMonth() !== lastRefreshDate.getMonth();
}

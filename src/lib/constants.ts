export const db_name = "ink_battles";
export const db_table = "analysis_requests";

// 使用额度与限制（字数）
export const PER_REQUEST_GUEST = 5000; // 未登录单次上限
export const PER_REQUEST_LOGGED = 60000; // 登录单次上限
export const DAILY_CAP_GUEST = 100000; // 未登录每日累计上限（按 IP 或 指纹 任一）

// 高级模型调用成本配置
export const ADVANCED_MODEL_BASE_COST = 0.5; // 单次高级模型调用基础成本（人民币）
export const GRANT_CALL_VIRTUAL_COST = 1.2; // 赠送调用虚拟单价（人民币）
export const MONTHLY_GRANT_BASE = 10; // 每月赠送保底次数
export const MONTHLY_GRANT_MAX = 80; // 每月赠送上限次数

// 会员等级和折扣配置
export const MEMBERSHIP_TIERS = {
	REGULAR: { minAmount: 0, maxAmount: 50, discount: 0, name: "普通会员" },
	BRONZE: { minAmount: 50, maxAmount: 150, discount: 0.05, name: "铜牌会员" },
	SILVER: { minAmount: 150, maxAmount: 300, discount: 0.1, name: "银牌会员" },
	GOLD: { minAmount: 300, maxAmount: 460, discount: 0.15, name: "金牌会员" },
	DIAMOND: { minAmount: 460, maxAmount: Infinity, discount: 0.2, name: "钻石会员" },
};

// 用户类型枚举
export enum UserType {
	GUEST = "guest", // 游客（未登录）
	REGULAR = "regular", // 普通用户（已登录但未捐赠）
	MEMBER = "member", // 会员用户（已登录且已捐赠）
}

// 会员等级枚举
export enum MemberTier {
	REGULAR = "REGULAR",
	BRONZE = "BRONZE",
	SILVER = "SILVER",
	GOLD = "GOLD",
	DIAMOND = "DIAMOND",
}

// 用户限制配置
export const USER_LIMITS = {
	[UserType.GUEST]: {
		perRequest: PER_REQUEST_GUEST,
		dailyLimit: DAILY_CAP_GUEST,
		advancedModelCalls: 0,
		hasUnlimitedAnalysis: false,
	},
	[UserType.REGULAR]: {
		perRequest: PER_REQUEST_LOGGED,
		dailyLimit: null, // 无日累计限制
		advancedModelCalls: 0,
		hasUnlimitedAnalysis: true,
	},
	[UserType.MEMBER]: {
		perRequest: null, // 无单次限制
		dailyLimit: null, // 无日累计限制
		advancedModelCalls: "calculated", // 根据捐赠金额计算
		hasUnlimitedAnalysis: true,
	},
};

/**
 * 获取会员等级
 * @param totalAmount 累计消费总额
 * @returns 会员等级信息
 */
export function getMemberTier(totalAmount: number) {
	for (const [tier, config] of Object.entries(MEMBERSHIP_TIERS)) {
		if (totalAmount >= config.minAmount && totalAmount < config.maxAmount) {
			return { tier: tier as MemberTier, ...config };
		}
	}
	return { tier: MemberTier.REGULAR, ...MEMBERSHIP_TIERS.REGULAR };
}

/**
 * 计算每月赠送调用次数（基于累计消费总额）
 * @param totalAmount 累计消费总额
 * @returns 每月赠送调用次数
 */
export function calculateMonthlyGrantCalls(totalAmount: number): number {
	const calculated = MONTHLY_GRANT_BASE + Math.floor(totalAmount / GRANT_CALL_VIRTUAL_COST);
	return Math.min(calculated, MONTHLY_GRANT_MAX);
}

/**
 * 计算付费购买单次调用价格
 * @param totalAmount 累计消费总额
 * @returns 单次调用价格
 */
export function calculatePaidCallPrice(totalAmount: number): number {
	const tierInfo = getMemberTier(totalAmount);
	return ADVANCED_MODEL_BASE_COST * (1 - tierInfo.discount);
}

/**
 * 根据捐赠金额计算会员每日高级模型调用次数 (兼容旧版本)
 * @deprecated 请使用新的计费系统
 * @param donationAmount 捐赠金额（人民币）
 * @returns 每日高级模型调用次数
 */
export function calculateAdvancedModelCalls(donationAmount: number): number {
	return Math.floor(donationAmount / ADVANCED_MODEL_BASE_COST * 2);
}

/**
 * 获取用户类型
 * @param isLoggedIn 是否登录
 * @param donationAmount 捐赠金额
 * @returns 用户类型
 */
export function getUserType(isLoggedIn: boolean, donationAmount?: number): UserType {
	if (!isLoggedIn)
		return UserType.GUEST;
	if (donationAmount && donationAmount > 0)
		return UserType.MEMBER;
	return UserType.REGULAR;
}

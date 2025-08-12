export const db_name = "ink_battles";
export const db_table = "analysis_requests";

// 使用额度与限制（字数）
export const PER_REQUEST_GUEST = 5000; // 未登录单次上限
export const PER_REQUEST_LOGGED = 60000; // 登录单次上限
export const DAILY_CAP_GUEST = 100000; // 未登录每日累计上限（按 IP 或 指纹 任一）

// 高级模型调用限制
export const ADVANCED_MODEL_BASE_COST = 0.2; // 单次高级模型调用基础成本（人民币）

// 会员等级划分和奖励比例
export const MEMBERSHIP_TIERS = [
	{ minAmount: 0, maxAmount: 50, bonusRate: 0 }, // 0% 额外奖励
	{ minAmount: 50, maxAmount: 200, bonusRate: 0.1 }, // 10% 额外奖励
	{ minAmount: 200, maxAmount: 500, bonusRate: 0.2 }, // 20% 额外奖励
	{ minAmount: 500, maxAmount: 1000, bonusRate: 0.3 }, // 30% 额外奖励
	{ minAmount: 1000, maxAmount: Infinity, bonusRate: 0.4 }, // 40% 额外奖励
];

// 用户类型枚举
export enum UserType {
	GUEST = "guest", // 游客（未登录）
	REGULAR = "regular", // 普通用户（已登录但未捐赠）
	MEMBER = "member", // 会员用户（已登录且已捐赠）
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
 * 根据捐赠金额计算会员每日高级模型调用次数
 * @param donationAmount 捐赠金额（人民币）
 * @returns 每日高级模型调用次数
 */
export function calculateAdvancedModelCalls(donationAmount: number): number {
	const tier = MEMBERSHIP_TIERS.find(tier => donationAmount >= tier.minAmount && donationAmount < tier.maxAmount);
	if (!tier)
		return 0;

	return Math.floor((donationAmount / ADVANCED_MODEL_BASE_COST) * (1 + tier.bonusRate));
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

import type { SubscriptionUserInfo } from "../auth/user";

// 重新导出用户类型以保持向后兼容
export type { SubscriptionUserInfo } from "../auth/user";

/**
 * 赞助者信息类型
 * 来源：subscription.ts
 */
export interface SponsorInfo {
	user_id: string;
	name: string;
	avatar?: string;
	all_sum_amount: number;
	bound_order_id?: string;
	binding_method: "oauth" | "order_id";
	create_time?: number;
	last_pay_time?: number;
}

/**
 * 订阅信息类型
 * 来源：subscription.ts
 */
export interface SubscriptionInfo {
	isSubscribed: boolean;
	sponsorInfo: SponsorInfo | null;
	totalAmount: number;
	currentPlan: any;
	subscriptionStatus: string;
}

/**
 * 用户订阅数据类型
 * 来源：subscription.ts
 */
export interface UserSubscriptionData {
	user: SubscriptionUserInfo;
	subscription: SubscriptionInfo;
}
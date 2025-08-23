import type { UserType } from "@/lib/constants";

/**
 * 使用量统计类型
 * 来源：dashboard/types.ts 和 usage-stats/route.ts
 */
export interface UsageStats {
	userType: UserType;
	totalAnalysis: number;
	monthlyAnalysis: number;
	todayAnalysis: number;
	totalTextLength: number;
	monthlyTextLength: number;
	todayTextLength: number;
	advancedModelStats?: {
		grantCallsRemaining: number;
		paidCallsRemaining: number;
		todayUsed: number;
	};
	limits: {
		perRequest: number | null;
		dailyLimit: number | null;
	};
}

/**
 * 用户计费信息类型
 * 来源：billing.ts
 */
export interface UserBilling {
	userEmail: string;
	totalSpent: number;
	monthlyDonation: number;
	grantCallsRemaining: number;
	paidCallsRemaining: number;
	lastGrantUpdate: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * 调用交易记录类型
 * 来源：billing.ts
 */
export interface CallTransaction {
	userEmail: string;
	type: "grant" | "purchase" | "usage";
	amount: number;
	description: string;
	relatedOrderId?: string;
	timestamp: Date;
}

/**
 * 月度赠送记录类型
 * 来源：billing.ts
 */
export interface MonthlyGrant {
	userEmail: string;
	year: number;
	month: number;
	donationAmount: number;
	grantedCalls: number;
	createdAt: Date;
}
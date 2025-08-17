import type { UserType } from "@/lib/constants";

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

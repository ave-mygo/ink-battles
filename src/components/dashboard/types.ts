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
		dailyLimit: number;
		todayUsed: number;
		remaining: number;
	};
	limits: {
		perRequest: number | null;
		dailyLimit: number | null;
	};
}

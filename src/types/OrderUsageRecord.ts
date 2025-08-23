export interface OrderUsageRecord {
	orderId: string;
	userEmail: string;
	usedAt: Date;
	redeemType: "calls" | "subscription" | "manual";
	redemptionValue: number;
	description?: string;
	adminUserEmail?: string;
}

export interface CreateOrderUsageRecordData {
	orderId: string;
	userEmail: string;
	redeemType: "calls" | "subscription" | "manual";
	redemptionValue: number;
	description?: string;
	adminUserEmail?: string;
}
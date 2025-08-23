/**
 * 订单使用记录类型
 * 来源：OrderUsageRecord.ts
 */
export interface OrderUsageRecord {
	orderId: string;
	userEmail: string;
	usedAt: Date;
	redeemType: "calls" | "subscription" | "manual";
	redemptionValue: number;
	description?: string;
	adminUserEmail?: string;
}

/**
 * 创建订单使用记录数据类型
 * 来源：OrderUsageRecord.ts
 */
export interface CreateOrderUsageRecordData {
	orderId: string;
	userEmail: string;
	redeemType: "calls" | "subscription" | "manual";
	redemptionValue: number;
	description?: string;
	adminUserEmail?: string;
}
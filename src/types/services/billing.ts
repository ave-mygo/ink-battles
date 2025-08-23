/**
 * 计费服务接口类型
 * 来源：billing-service.ts
 */
export interface BillingService {
	getUserBillingInfo: (userEmail: string) => Promise<any>;
	processDonation: (userEmail: string, amount: number, orderId: string) => Promise<void>;
	processCallPurchase: (userEmail: string, calls: number) => Promise<{ success: boolean; cost: number; orderId: string }>;
	calculateCallCost: (userEmail: string, calls: number) => Promise<number>;
	getMembershipInfo: (userEmail: string) => Promise<any>;
}
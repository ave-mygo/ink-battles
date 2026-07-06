import type { BillingPromotionSnapshot, SerializedBillingPromotionSnapshot } from "./promo_code";

export interface UserBilling {
	_id?: string;
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	activePromotion?: BillingPromotionSnapshot | null;
	lastGrantRefresh: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface SerializedUserBilling {
	uid: number;
	totalAmount: number;
	grantCallsBalance: number;
	paidCallsBalance: number;
	activePromotion?: SerializedBillingPromotionSnapshot | null;
	lastGrantRefresh: string;
	createdAt: string;
	updatedAt: string;
}

import type { ApiResult } from "../api";
import type { SerializedUserBilling } from "../database/user_billing";

export interface BillingSummaryState {
	billing: SerializedUserBilling;
	memberTier: string;
	memberName: string;
	discount: number;
	paidCallPrice: number;
}

export type BillingSummaryResult = ApiResult<BillingSummaryState>;

export interface AvailableCallsPayload {
	grantCalls: number;
	paidCalls: number;
	totalCalls: number;
}

export type AvailableCallsResult = ApiResult<AvailableCallsPayload>;

export interface OrderRedemptionOrderPreview {
	valid: boolean;
	paid: boolean;
	redeemed: boolean;
	accountMatched: boolean;
	amount: number | null;
	message: string;
}

export interface OrderRedemptionPromoCodePreview {
	checked: boolean;
	valid: boolean;
	code: string | null;
	message: string;
	description: string | null;
	discountMultiplier: number | null;
	discountPercent: number | null;
	maxRedemptions: number | null;
	redeemedCount: number | null;
	perUserMaxRedemptions: number | null;
	userRedemptionCount: number | null;
	startsAt: string | null;
	endsAt: string | null;
}

export interface OrderRedemptionCalculationPreview {
	canRedeem: boolean;
	orderAmount: number;
	currentTotalAmount: number;
	totalAmountAfterRedemption: number;
	paidCallPriceBeforePromo: number;
	paidCallPriceAfterPromo: number;
	paidCallsBeforePromo: number;
	paidCallsAfterPromo: number;
	extraPaidCallsFromPromo: number;
	grantCallsAdded: number;
	totalCallsAddedBeforePromo: number;
	totalCallsAddedAfterPromo: number;
	memberNameBefore: string;
	memberNameAfter: string;
	memberDiscountBefore: number;
	memberDiscountAfter: number;
	monthlyGrantCallsBefore: number;
	monthlyGrantCallsAfter: number;
}

export interface OrderRedemptionPreviewPayload {
	orderNo: string;
	order: OrderRedemptionOrderPreview;
	promoCode: OrderRedemptionPromoCodePreview;
	calculation: OrderRedemptionCalculationPreview | null;
}

export type OrderRedemptionPreviewResult = ApiResult<OrderRedemptionPreviewPayload>;

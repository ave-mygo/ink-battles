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

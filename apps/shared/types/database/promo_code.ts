export type PromoCodeScope = "order_redemption";

export interface BillingPromotionSnapshot {
	code: string;
	scope: PromoCodeScope;
	discountMultiplier: number;
	startsAt: Date;
	endsAt: Date;
	redeemedAt: Date;
}

export interface SerializedBillingPromotionSnapshot {
	code: string;
	scope: PromoCodeScope;
	discountMultiplier: number;
	startsAt: string;
	endsAt: string;
	redeemedAt: string;
}

export interface PromoCode {
	_id?: string;
	code: string;
	scope: PromoCodeScope;
	discountMultiplier: number;
	maxRedemptions: number;
	perUserMaxRedemptions: number;
	redeemedCount: number;
	startsAt: Date;
	endsAt: Date;
	active: boolean;
	description?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface PromoCodeRedemption {
	_id?: string;
	code: string;
	uid: number;
	scope: PromoCodeScope;
	discountMultiplier: number;
	redeemedAt: Date;
	expiresAt: Date;
}

export interface SerializedPromoCode {
	_id: string;
	code: string;
	scope: PromoCodeScope;
	discountMultiplier: number;
	maxRedemptions: number;
	perUserMaxRedemptions: number;
	redeemedCount: number;
	startsAt: string;
	endsAt: string;
	active: boolean;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SerializedPromoCodeRedemption {
	_id: string;
	code: string;
	uid: number;
	scope: PromoCodeScope;
	discountMultiplier: number;
	redeemedAt: string;
	expiresAt: string;
}

export interface AdminPromoCodeListData {
	codes: SerializedPromoCode[];
	recentRedemptions: SerializedPromoCodeRedemption[];
}

import type { BillingPromotionSnapshot, PromoCode, PromoCodeRedemption } from "@ink-battles/shared/types/database/promo_code";
import type { UserBilling } from "@ink-battles/shared/types/database/user_billing";
import type { AuthUser } from "@ink-battles/shared/types/users/user";
import { Elysia, t } from "elysia";
import type { ClientSession } from "mongodb";
import {
	BILLING_CONSTANTS,
	calculateInitialGrantCalls,
	calculateMonthlyGrantCalls,
	calculatePaidCallPrice,
	calculatePaidCallsFromOrder,
	getBillingTierInfo,
	shouldRefreshGrantCalls,
} from "../constants/billing";
import { COLLECTIONS, collection, findOneAndUpdate, insertOne, updateOne, withTransaction } from "../db/mongo";
import { getUserBilling } from "../db/repositories";
import { verifyOrderOwnership } from "../integrations/afdian";
import { requireUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { ok } from "../utils/response";

const ensureUserBilling = async (uid: number) => {
	let billing = await getUserBilling(uid);

	if (!billing) {
		await initializeUserBilling(uid);
		billing = await getUserBilling(uid);
	}

	return billing;
};

const isDuplicateKeyError = (error: unknown) =>
	typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;

const getUserBillingInSession = async (uid: number, session: ClientSession) =>
	(await collection<UserBilling>(COLLECTIONS.userBilling)).findOne({ uid }, { session });

const normalizePromoCode = (code: string) => code.trim().toUpperCase();

const getActiveOrderPromotion = (billing: UserBilling | null, now = new Date()): BillingPromotionSnapshot | null => {
	const promotion = billing?.activePromotion;
	if (!promotion || promotion.scope !== "order_redemption")
		return null;

	const startsAt = new Date(promotion.startsAt);
	const endsAt = new Date(promotion.endsAt);
	if (startsAt > now || endsAt <= now)
		return null;

	return promotion;
};

const getOrderPromotionDiscountMultiplier = (billing: UserBilling | null) =>
	getActiveOrderPromotion(billing)?.discountMultiplier ?? 1;

export const initializeUserBilling = async (uid: number) => {
	if (await getUserBilling(uid))
		return true;
	const now = new Date();
	return insertOne<UserBilling>(COLLECTIONS.userBilling, {
		uid,
		totalAmount: 0,
		grantCallsBalance: 0,
		paidCallsBalance: BILLING_CONSTANTS.NEW_USER_BONUS,
		lastGrantRefresh: now,
		createdAt: now,
		updatedAt: now,
	});
};

export const refreshGrantCallsIfNeeded = async (uid: number) => {
	const billing = await getUserBilling(uid);
	if (!billing || !shouldRefreshGrantCalls(billing.lastGrantRefresh))
		return false;
	return updateOne<UserBilling>(COLLECTIONS.userBilling, { uid }, {
		grantCallsBalance: billing.totalAmount > 0 ? calculateMonthlyGrantCalls(billing.totalAmount) : 0,
		lastGrantRefresh: new Date(),
		updatedAt: new Date(),
	});
};

export type BillingDeductedFrom = "grant" | "paid";

export const deductCallBalanceInTransaction = async (uid: number, session: ClientSession): Promise<BillingDeductedFrom | null> => {
	const billing = await getUserBillingInSession(uid, session);
	if (!billing)
		return null;
	const now = new Date();
	if (shouldRefreshGrantCalls(billing.lastGrantRefresh)) {
		await updateOne<UserBilling>(COLLECTIONS.userBilling, { uid }, {
			$set: {
				grantCallsBalance: billing.totalAmount > 0 ? calculateMonthlyGrantCalls(billing.totalAmount) : 0,
				lastGrantRefresh: now,
				updatedAt: now,
			},
		}, session);
	}

	const deductedGrant = await findOneAndUpdate<UserBilling>(COLLECTIONS.userBilling, {
		uid,
		grantCallsBalance: { $gt: 0 },
	}, {
		$inc: { grantCallsBalance: -1 },
		$set: { updatedAt: now },
	}, { session });
	if (deductedGrant)
		return "grant";

	const deductedPaid = await findOneAndUpdate<UserBilling>(COLLECTIONS.userBilling, {
		uid,
		paidCallsBalance: { $gt: 0 },
	}, {
		$inc: { paidCallsBalance: -1 },
		$set: { updatedAt: now },
	}, { session });
	return deductedPaid ? "paid" : null;
};

export const deductCallBalance = async (uid: number) => {
	let deductedFrom: BillingDeductedFrom | null = null;
	await withTransaction(async (session) => {
		deductedFrom = await deductCallBalanceInTransaction(uid, session);
	});
	return !!deductedFrom;
};

export const refundCallBalance = async (uid: number, deductedFrom: BillingDeductedFrom, session?: ClientSession) => {
	const field = deductedFrom === "grant" ? "grantCallsBalance" : "paidCallsBalance";
	return !!await findOneAndUpdate<UserBilling>(COLLECTIONS.userBilling, { uid }, {
		$inc: { [field]: 1 },
		$set: { updatedAt: new Date() },
	} as never, { session });
};

export const billingModule = new Elysia()
	.get("/api/v2/billing/summary", async ({ request }) => {
		const user = await requireUser(request.headers);
		await refreshGrantCallsIfNeeded(user.uid);
		const billing = await ensureUserBilling(user.uid);
		if (!billing)
			return { success: false, message: "计费信息不存在" };
		const tier = getBillingTierInfo(billing.totalAmount);
		const promotionDiscountMultiplier = getOrderPromotionDiscountMultiplier(billing);
		return ok({
			billing,
			memberTier: tier.tier,
			memberName: tier.name,
			discount: tier.discount,
			paidCallPrice: calculatePaidCallPrice(billing.totalAmount, promotionDiscountMultiplier),
		});
	}, { detail: { tags: ["REST: Billing"] } })
	.get("/api/v2/billing/available-calls", async ({ request }) => {
		const user = await requireUser(request.headers);
		await refreshGrantCallsIfNeeded(user.uid);
		const billing = await ensureUserBilling(user.uid);
		return ok({ grantCalls: billing?.grantCallsBalance ?? 0, paidCalls: billing?.paidCallsBalance ?? 0, totalCalls: (billing?.grantCallsBalance ?? 0) + (billing?.paidCallsBalance ?? 0) });
	}, { detail: { tags: ["REST: Billing"] } })
	.post("/api/v2/rpc/billing.redeemOrder", async ({ request, body }) => {
		const user = await requireUser(request.headers) as AuthUser;
		if (!user.afdId)
			return { success: false, message: "请先绑定爱发电账户" };
		const orderNo = body.orderNo.trim();
		const verification = await verifyOrderOwnership(orderNo, user.afdId);
		if (!verification.valid)
			return { success: false, message: verification.message };

		const billing = await ensureUserBilling(user.uid);
		if (!billing)
			return { success: false, message: "用户计费信息不存在" };
		
		const amount = verification.amount ?? 0;
		const now = new Date();
		const code = body.promoCode ? normalizePromoCode(body.promoCode) : null;
		
		let calls = 0;
		let grant = 0;
		let appliedPromoCode: string | null = null;

		try {
			await withTransaction(async (session) => {
				let promotionDiscountMultiplier = 1;
				
				if (code) {
					const promoCodeDoc = await (await collection<PromoCode>(COLLECTIONS.promoCodes)).findOne({
						code,
						active: true,
						scope: "order_redemption",
						startsAt: { $lte: now },
						endsAt: { $gt: now },
					}, { session });

					if (!promoCodeDoc)
						throw new Error("PROMO_NOT_AVAILABLE");
					if (promoCodeDoc.redeemedCount >= promoCodeDoc.maxRedemptions)
						throw new Error("PROMO_EXHAUSTED");
					const perUserMaxRedemptions = promoCodeDoc.perUserMaxRedemptions ?? 1;
					if (perUserMaxRedemptions <= 0)
						throw new Error("PROMO_INVALID_USER_LIMIT");
					const userRedemptionCount = await (await collection<PromoCodeRedemption>(COLLECTIONS.promoCodeRedemptions)).countDocuments({ code, uid: user.uid }, { session });
					if (userRedemptionCount >= perUserMaxRedemptions)
						throw new Error("PROMO_USER_EXHAUSTED");
					if (promoCodeDoc.discountMultiplier <= 0 || promoCodeDoc.discountMultiplier > 1)
						throw new Error("PROMO_INVALID_DISCOUNT");

					await insertOne<PromoCodeRedemption>(COLLECTIONS.promoCodeRedemptions, {
						code,
						uid: user.uid,
						scope: promoCodeDoc.scope,
						discountMultiplier: promoCodeDoc.discountMultiplier,
						redeemedAt: now,
						expiresAt: promoCodeDoc.endsAt,
					}, session);

					const increasedUsage = await updateOne<PromoCode>(COLLECTIONS.promoCodes, {
						code,
						redeemedCount: promoCodeDoc.redeemedCount,
					}, {
						$inc: { redeemedCount: 1 },
						$set: { updatedAt: now },
					}, session);
					
					if (!increasedUsage)
						throw new Error("PROMO_EXHAUSTED");
					
					promotionDiscountMultiplier = promoCodeDoc.discountMultiplier;
					appliedPromoCode = code;
				}

				calls = calculatePaidCallsFromOrder(amount, billing.totalAmount, promotionDiscountMultiplier);
				grant = calculateInitialGrantCalls(billing.totalAmount);

				await insertOne(COLLECTIONS.afdOrders, { orderNo, uid: user.uid, afdId: user.afdId, amount, redeemedAt: now, grantCallsAdded: grant, paidCallsAdded: calls }, session);
				await updateOne<UserBilling>(COLLECTIONS.userBilling, { uid: user.uid }, { $inc: { totalAmount: amount, paidCallsBalance: calls, grantCallsBalance: grant }, $set: { updatedAt: now } } as never, session);
			});
		} catch (error) {
			if (isDuplicateKeyError(error))
				return { success: false, message: "该订单已被兑换，请勿重复使用" };
			if (error instanceof Error) {
				const messages: Record<string, string> = {
					PROMO_NOT_AVAILABLE: "促销码不存在、未启用或不在有效期内",
					PROMO_EXHAUSTED: "促销码使用次数已耗尽",
					PROMO_USER_EXHAUSTED: "当前账户已达到该促销码的使用次数上限",
					PROMO_INVALID_DISCOUNT: "促销码折扣配置无效",
					PROMO_INVALID_USER_LIMIT: "促销码单用户使用次数配置无效",
				};
				if (messages[error.message])
					return { success: false, message: messages[error.message] };
			}
			throw error;
		}
		
		writeAuditLog({ event: "order_redeemed", uid: user.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { orderNo, amount, calls, grant, promoCode: appliedPromoCode } });
		return { success: true, message: `兑换成功！累计消费：¥${(billing.totalAmount + amount).toFixed(2)}，付费次数+${calls}${appliedPromoCode ? `（已使用促销码 ${appliedPromoCode}）` : ""}${grant ? `（首次兑换，补发当月赠送次数+${grant}）` : ""}` };
	}, { body: t.Object({ orderNo: t.String(), promoCode: t.Optional(t.String()) }), detail: { tags: ["RPC: Billing"] } });

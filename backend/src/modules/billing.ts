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
import { COLLECTIONS, collection, findOne, findOneAndUpdate, insertOne, updateOne, withTransaction } from "../db/mongo";
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
		return ok({
			billing,
			memberTier: tier.tier,
			memberName: tier.name,
			discount: tier.discount,
			paidCallPrice: calculatePaidCallPrice(billing.totalAmount),
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
		const calls = calculatePaidCallsFromOrder(amount, billing.totalAmount);
		const grant = calculateInitialGrantCalls(billing.totalAmount);
		try {
			await withTransaction(async (session) => {
				await insertOne(COLLECTIONS.afdOrders, { orderNo, uid: user.uid, afdId: user.afdId, amount, redeemedAt: new Date(), grantCallsAdded: grant, paidCallsAdded: calls }, session);
				await updateOne<UserBilling>(COLLECTIONS.userBilling, { uid: user.uid }, { $inc: { totalAmount: amount, paidCallsBalance: calls, grantCallsBalance: grant }, $set: { updatedAt: new Date() } } as never, session);
			});
		} catch (error) {
			if (isDuplicateKeyError(error))
				return { success: false, message: "该订单已被兑换，请勿重复使用" };
			throw error;
		}
		writeAuditLog({ event: "order_redeemed", uid: user.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { orderNo, amount, calls, grant } });
		return { success: true, message: `兑换成功！累计消费：¥${(billing.totalAmount + amount).toFixed(2)}，付费次数+${calls}${grant ? `（首次兑换，补发当月赠送次数+${grant}）` : ""}` };
	}, { body: t.Object({ orderNo: t.String() }), detail: { tags: ["RPC: Billing"] } });

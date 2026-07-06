import type {
  OrderRedemptionCalculationPreview,
  OrderRedemptionOrderPreview,
  OrderRedemptionPromoCodePreview,
} from "@ink-battles/shared/types/common/billing";
import type { AfdOrder } from "@ink-battles/shared/types/database/afd_order";
import type { BillingPromotionSnapshot, PromoCode, PromoCodeRedemption } from "@ink-battles/shared/types/database/promo_code";
import type { UserBilling } from "@ink-battles/shared/types/database/user_billing";
import type { AuthUser } from "@ink-battles/shared/types/users/user";
import type { ClientSession } from "mongodb";
import { Elysia, t } from "elysia";
import {
  BILLING_CONSTANTS,
  calculateInitialGrantCalls,
  calculateMonthlyGrantCalls,
  calculatePaidCallPrice,
  calculatePaidCallsFromOrder,
  getBillingTierInfo,
  shouldRefreshGrantCalls,
} from "../constants/billing";
import { collection, COLLECTIONS, findOneAndUpdate, insertOne, updateOne, withTransaction } from "../db/mongo";
import { getUserBilling } from "../db/repositories";
import { queryAfdianOrder, verifyOrderOwnership } from "../integrations/afdian";
import { requireUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { ok } from "../utils/response";

/**
 * 确保用户计费记录存在，若不存在则初始化
 * @param uid - 用户 ID
 * @returns 用户计费记录
 */
async function ensureUserBilling(uid: number) {
  let billing = await getUserBilling(uid);

  if (!billing) {
    await initializeUserBilling(uid);
    billing = await getUserBilling(uid);
  }

  return billing;
}

/**
 * 判断错误是否为 MongoDB 重复键错误
 * @param error - 错误对象
 * @returns 是否为重复键错误
 */
function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

/**
 * 判断未知值是否为普通对象记录。
 * @param value - 待判断的未知值
 * @returns 是否可按对象字段读取
 */
function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 从爱发电订单查询结果中安全读取首个订单。
 * @param data - 爱发电 API 原始响应
 * @returns 订单记录，无记录时返回 null
 */
function getFirstAfdianOrder(data: unknown): Record<string, unknown> | null {
  if (!isObjectRecord(data) || !isObjectRecord(data.data) || !Array.isArray(data.data.list)) {
    return null;
  }

  const [order] = data.data.list;
  return isObjectRecord(order) ? order : null;
}

/**
 * 在事务会话中获取用户计费记录
 * @param uid - 用户 ID
 * @param session - MongoDB 事务会话
 * @returns 用户计费记录
 */
async function getUserBillingInSession(uid: number, session: ClientSession) {
  return (await collection<UserBilling>(COLLECTIONS.userBilling)).findOne({ uid }, { session });
}

/**
 * 标准化促销码格式（去除空格并转为大写）
 * @param code - 原始促销码
 * @returns 标准化后的促销码
 */
const normalizePromoCode = (code: string) => code.trim().toUpperCase();

/**
 * 获取用户当前有效的订单促销活动
 * @param billing - 用户计费记录
 * @param now - 当前时间，默认为当前时刻
 * @returns 有效的促销活动快照，无有效活动时返回 null
 */
function getActiveOrderPromotion(billing: UserBilling | null, now = new Date()): BillingPromotionSnapshot | null {
  const promotion = billing?.activePromotion;
  if (!promotion || promotion.scope !== "order_redemption")
    return null;

  const startsAt = new Date(promotion.startsAt);
  const endsAt = new Date(promotion.endsAt);
  if (startsAt > now || endsAt <= now)
    return null;

  return promotion;
}

/**
 * 获取订单促销折扣倍率
 * @param billing - 用户计费记录
 * @returns 折扣倍率，无促销时返回 1
 */
function getOrderPromotionDiscountMultiplier(billing: UserBilling | null) {
  return getActiveOrderPromotion(billing)?.discountMultiplier ?? 1;
}

/**
 * 构建空优惠码预览结果。
 * @returns 未填写优惠码时的稳定预览结构
 */
function createEmptyPromoCodePreview(): OrderRedemptionPromoCodePreview {
  return {
    checked: false,
    valid: true,
    code: null,
    message: "未填写优惠码",
    description: null,
    discountMultiplier: null,
    discountPercent: null,
    maxRedemptions: null,
    redeemedCount: null,
    perUserMaxRedemptions: null,
    userRedemptionCount: null,
    startsAt: null,
    endsAt: null,
  };
}

/**
 * 只读校验订单兑换优惠码，不写入兑换记录。
 * @param code - 标准化后的优惠码
 * @param uid - 当前用户 ID
 * @param now - 当前时间
 * @returns 优惠码预览信息
 */
async function previewPromoCode(code: string | null, uid: number, now: Date): Promise<OrderRedemptionPromoCodePreview> {
  if (!code) {
    return createEmptyPromoCodePreview();
  }

  const promoCodeDoc = await (await collection<PromoCode>(COLLECTIONS.promoCodes)).findOne({
    code,
    active: true,
    scope: "order_redemption",
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  });

  if (!promoCodeDoc) {
    return {
      ...createEmptyPromoCodePreview(),
      checked: true,
      valid: false,
      code,
      message: "优惠码不存在、未启用或不在有效期内",
    };
  }

  const perUserMaxRedemptions = promoCodeDoc.perUserMaxRedemptions ?? 1;
  const userRedemptionCount = await (await collection<PromoCodeRedemption>(COLLECTIONS.promoCodeRedemptions)).countDocuments({ code, uid });
  const discountPercent = Math.round((1 - promoCodeDoc.discountMultiplier) * 100);
  const basePreview: OrderRedemptionPromoCodePreview = {
    checked: true,
    valid: true,
    code,
    message: "优惠码可用",
    description: promoCodeDoc.description ?? null,
    discountMultiplier: promoCodeDoc.discountMultiplier,
    discountPercent,
    maxRedemptions: promoCodeDoc.maxRedemptions,
    redeemedCount: promoCodeDoc.redeemedCount,
    perUserMaxRedemptions,
    userRedemptionCount,
    startsAt: promoCodeDoc.startsAt.toISOString(),
    endsAt: promoCodeDoc.endsAt.toISOString(),
  };

  if (promoCodeDoc.redeemedCount >= promoCodeDoc.maxRedemptions) {
    return { ...basePreview, valid: false, message: "优惠码使用次数已耗尽" };
  }

  if (perUserMaxRedemptions <= 0) {
    return { ...basePreview, valid: false, message: "优惠码单用户使用次数配置无效" };
  }

  if (userRedemptionCount >= perUserMaxRedemptions) {
    return { ...basePreview, valid: false, message: "当前账户已达到该优惠码的使用次数上限" };
  }

  if (promoCodeDoc.discountMultiplier <= 0 || promoCodeDoc.discountMultiplier > 1) {
    return { ...basePreview, valid: false, message: "优惠码折扣配置无效" };
  }

  return basePreview;
}

/**
 * 根据订单金额、用户权益和优惠码折扣计算兑换预览。
 * @param amount - 订单金额
 * @param billing - 用户计费信息
 * @param promoCodePreview - 优惠码校验结果
 * @returns 兑换次数和权益变化预览
 */
function createOrderRedemptionCalculationPreview(
  amount: number,
  billing: UserBilling,
  promoCodePreview: OrderRedemptionPromoCodePreview,
): OrderRedemptionCalculationPreview {
  const discountMultiplier = promoCodePreview.checked && promoCodePreview.valid && promoCodePreview.discountMultiplier
    ? promoCodePreview.discountMultiplier
    : 1;
  const memberBefore = getBillingTierInfo(billing.totalAmount);
  const nextTotalAmount = billing.totalAmount + amount;
  const memberAfter = getBillingTierInfo(nextTotalAmount);
  const paidCallPriceBeforePromo = calculatePaidCallPrice(billing.totalAmount, 1);
  const paidCallPriceAfterPromo = calculatePaidCallPrice(billing.totalAmount, discountMultiplier);
  const paidCallsBeforePromo = calculatePaidCallsFromOrder(amount, billing.totalAmount, 1);
  const paidCallsAfterPromo = calculatePaidCallsFromOrder(amount, billing.totalAmount, discountMultiplier);
  const grantCallsAdded = calculateInitialGrantCalls(billing.totalAmount);

  return {
    canRedeem: true,
    orderAmount: amount,
    currentTotalAmount: billing.totalAmount,
    totalAmountAfterRedemption: nextTotalAmount,
    paidCallPriceBeforePromo,
    paidCallPriceAfterPromo,
    paidCallsBeforePromo,
    paidCallsAfterPromo,
    extraPaidCallsFromPromo: paidCallsAfterPromo - paidCallsBeforePromo,
    grantCallsAdded,
    totalCallsAddedBeforePromo: paidCallsBeforePromo + grantCallsAdded,
    totalCallsAddedAfterPromo: paidCallsAfterPromo + grantCallsAdded,
    memberNameBefore: memberBefore.name,
    memberNameAfter: memberAfter.name,
    memberDiscountBefore: memberBefore.discount,
    memberDiscountAfter: memberAfter.discount,
    monthlyGrantCallsBefore: billing.totalAmount > 0 ? calculateMonthlyGrantCalls(billing.totalAmount) : 0,
    monthlyGrantCallsAfter: calculateMonthlyGrantCalls(nextTotalAmount),
  };
}

/**
 * 初始化用户计费记录
 * 为新用户创建计费记录并赋予新用户奖励次数
 * @param uid - 用户 ID
 * @returns 是否成功初始化
 */
export async function initializeUserBilling(uid: number) {
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
}

/**
 * 按需刷新用户的每月赠送次数
 * 若距离上次刷新超过一个月，则根据累计消费额重新计算赠送次数
 * @param uid - 用户 ID
 * @returns 是否成功刷新
 */
export async function refreshGrantCallsIfNeeded(uid: number) {
  const billing = await getUserBilling(uid);
  if (!billing || !shouldRefreshGrantCalls(billing.lastGrantRefresh))
    return false;
  return updateOne<UserBilling>(COLLECTIONS.userBilling, { uid }, {
    grantCallsBalance: billing.totalAmount > 0 ? calculateMonthlyGrantCalls(billing.totalAmount) : 0,
    lastGrantRefresh: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * 检查用户是否为赞助账户（累计消费大于 0）
 * @param uid - 用户 ID
 * @returns 是否为赞助账户
 */
export async function hasDonatedAccount(uid: number): Promise<boolean> {
  const billing = await getUserBilling(uid);
  return (billing?.totalAmount ?? 0) > 0;
}

export type BillingDeductedFrom = "grant" | "paid";

/**
 * 在事务中扣除用户的调用次数余额
 * 优先扣除赠送次数，其次扣除付费次数
 * 若需要刷新每月赠送次数，会先执行刷新
 * @param uid - 用户 ID
 * @param session - MongoDB 事务会话
 * @returns 扣除来源（"grant" 或 "paid"），余额不足时返回 null
 */
export async function deductCallBalanceInTransaction(uid: number, session: ClientSession): Promise<BillingDeductedFrom | null> {
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
}

/**
 * 扣除用户的调用次数余额（对外接口）
 * 使用事务包装 deductCallBalanceInTransaction
 * @param uid - 用户 ID
 * @returns 是否成功扣除
 */
export async function deductCallBalance(uid: number) {
  let deductedFrom: BillingDeductedFrom | null = null;
  await withTransaction(async (session) => {
    deductedFrom = await deductCallBalanceInTransaction(uid, session);
  });
  return !!deductedFrom;
}

/**
 * 退还用户的调用次数余额
 * @param uid - 用户 ID
 * @param deductedFrom - 扣除来源，决定退还到哪个余额
 * @param session - 可选的事务会话
 * @returns 是否成功退款
 */
export async function refundCallBalance(uid: number, deductedFrom: BillingDeductedFrom, session?: ClientSession) {
  const field = deductedFrom === "grant" ? "grantCallsBalance" : "paidCallsBalance";
  return !!await findOneAndUpdate<UserBilling>(COLLECTIONS.userBilling, { uid }, {
    $inc: { [field]: 1 },
    $set: { updatedAt: new Date() },
  } as never, { session });
}

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
  .post("/api/v2/rpc/billing.previewOrderRedemption", async ({ request, body }) => {
    const user = await requireUser(request.headers) as AuthUser;
    const orderNo = body.orderNo.trim();

    if (orderNo.length !== BILLING_CONSTANTS.ORDER_NO_LENGTH) {
      return ok({
        orderNo,
        order: {
          valid: false,
          paid: false,
          redeemed: false,
          accountMatched: false,
          amount: null,
          message: `订单号需要 ${BILLING_CONSTANTS.ORDER_NO_LENGTH} 位`,
        } satisfies OrderRedemptionOrderPreview,
        promoCode: createEmptyPromoCodePreview(),
        calculation: null,
      });
    }

    const code = body.promoCode ? normalizePromoCode(body.promoCode) : null;
    const promoCodePreview = await previewPromoCode(code, user.uid, new Date());

    if (!user.afdId) {
      return ok({
        orderNo,
        order: {
          valid: false,
          paid: false,
          redeemed: false,
          accountMatched: false,
          amount: null,
          message: "请先绑定爱发电账户",
        } satisfies OrderRedemptionOrderPreview,
        promoCode: promoCodePreview,
        calculation: null,
      });
    }

    const redeemedOrder = await (await collection<AfdOrder>(COLLECTIONS.afdOrders)).findOne({ orderNo });
    if (redeemedOrder) {
      return ok({
        orderNo,
        order: {
          valid: false,
          paid: true,
          redeemed: true,
          accountMatched: redeemedOrder.afdId === user.afdId,
          amount: redeemedOrder.amount,
          message: "该订单已被兑换，请勿重复使用",
        } satisfies OrderRedemptionOrderPreview,
        promoCode: promoCodePreview,
        calculation: null,
      });
    }

    const order = getFirstAfdianOrder(await queryAfdianOrder(orderNo));
    if (!order) {
      return ok({
        orderNo,
        order: {
          valid: false,
          paid: false,
          redeemed: false,
          accountMatched: false,
          amount: null,
          message: "订单不存在",
        } satisfies OrderRedemptionOrderPreview,
        promoCode: promoCodePreview,
        calculation: null,
      });
    }

    const amount = Number(order.total_amount) || 0;
    const paid = order.status === 2;
    const accountMatched = order.user_id === user.afdId;
    const positiveAmount = amount > 0;
    const orderPreview: OrderRedemptionOrderPreview = {
      valid: paid && accountMatched && positiveAmount,
      paid,
      redeemed: false,
      accountMatched,
      amount,
      message: !accountMatched
        ? "订单不属于当前绑定的爱发电账号"
        : paid
          ? positiveAmount ? "订单可兑换" : "订单金额无效，无法兑换"
          : "订单未支付完成",
    };

    const billing = await ensureUserBilling(user.uid);
    const calculation = billing && orderPreview.valid && promoCodePreview.valid
      ? createOrderRedemptionCalculationPreview(amount, billing, promoCodePreview)
      : null;

    return ok({
      orderNo,
      order: orderPreview,
      promoCode: promoCodePreview,
      calculation,
    });
  }, { body: t.Object({ orderNo: t.String(), promoCode: t.Optional(t.String()) }), detail: { tags: ["RPC: Billing"] } })
  .post("/api/v2/rpc/billing.redeemOrder", async ({ request, body }) => {
    const user = await requireUser(request.headers) as AuthUser;
    if (!user.afdId)
      return { success: false, message: "请先绑定爱发电账户" };
    const orderNo = body.orderNo.trim();
    if (orderNo.length !== BILLING_CONSTANTS.ORDER_NO_LENGTH)
      return { success: false, message: `订单号需要 ${BILLING_CONSTANTS.ORDER_NO_LENGTH} 位` };
    const redeemedOrder = await (await collection<AfdOrder>(COLLECTIONS.afdOrders)).findOne({ orderNo });
    if (redeemedOrder)
      return { success: false, message: "该订单已被兑换，请勿重复使用" };
    const verification = await verifyOrderOwnership(orderNo, user.afdId);
    if (!verification.valid)
      return { success: false, message: verification.message };

    const billing = await ensureUserBilling(user.uid);
    if (!billing)
      return { success: false, message: "用户计费信息不存在" };

    const amount = verification.amount ?? 0;
    if (amount <= 0)
      return { success: false, message: "订单金额无效，无法兑换" };
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

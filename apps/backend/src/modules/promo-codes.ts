import type {
  AdminPromoCodeListData,
  PromoCode,
  PromoCodeRedemption,
  PromoCodeScope,
  SerializedPromoCode,
  SerializedPromoCodeRedemption,
} from "@ink-battles/shared/types/database/promo_code";
import type { WithId } from "mongodb";
import { randomBytes } from "node:crypto";
import { Elysia, t } from "elysia";
import { collection, COLLECTIONS, insertOne, updateOne } from "../db/mongo";
import { requireAdmin } from "../middleware/auth";
import { ok } from "../utils/response";

const PROMO_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PROMO_CODE_PREFIX_REGEX = /[^A-Z0-9]/g;

/**
 * 标准化优惠码前缀。
 * 管理员输入常带空格或短横线，这里统一清洗，避免生成无法兑换的码值。
 */
function normalizePromoCodePrefix(prefix: string | undefined): string {
  return (prefix ?? "").trim().toUpperCase().replace(PROMO_CODE_PREFIX_REGEX, "");
}

/**
 * 生成指定长度的随机优惠码片段。
 * @param length - 随机片段长度
 * @returns 大写优惠码片段
 */
function generateRandomCodeSegment(length: number): string {
  const bytes = randomBytes(length);
  return Array.from({ length }, (_, index) => PROMO_CODE_ALPHABET[bytes[index]! % PROMO_CODE_ALPHABET.length]!).join("");
}

/**
 * 序列化优惠码文档，确保前端拿到稳定的字符串日期和字符串 ID。
 * @param promoCode - MongoDB 优惠码文档
 * @returns 前端可直接渲染的优惠码数据
 */
function serializePromoCode(promoCode: WithId<PromoCode>): SerializedPromoCode {
  return {
    _id: promoCode._id.toString(),
    code: promoCode.code,
    scope: promoCode.scope,
    discountMultiplier: promoCode.discountMultiplier,
    maxRedemptions: promoCode.maxRedemptions,
    perUserMaxRedemptions: promoCode.perUserMaxRedemptions,
    redeemedCount: promoCode.redeemedCount,
    startsAt: new Date(promoCode.startsAt).toISOString(),
    endsAt: new Date(promoCode.endsAt).toISOString(),
    active: promoCode.active,
    description: promoCode.description ?? null,
    createdAt: new Date(promoCode.createdAt).toISOString(),
    updatedAt: new Date(promoCode.updatedAt).toISOString(),
  };
}

/**
 * 序列化优惠码兑换记录。
 * @param redemption - MongoDB 兑换记录文档
 * @returns 前端可直接渲染的兑换记录数据
 */
function serializePromoCodeRedemption(redemption: WithId<PromoCodeRedemption>): SerializedPromoCodeRedemption {
  return {
    _id: redemption._id.toString(),
    code: redemption.code,
    uid: redemption.uid,
    scope: redemption.scope,
    discountMultiplier: redemption.discountMultiplier,
    redeemedAt: new Date(redemption.redeemedAt).toISOString(),
    expiresAt: new Date(redemption.expiresAt).toISOString(),
  };
}

/**
 * 批量生成不重复的优惠码。
 * @param count - 生成数量
 * @param length - 随机片段长度
 * @param prefix - 可选前缀
 * @returns 唯一优惠码列表
 */
async function generateUniquePromoCodes(count: number, length: number, prefix: string): Promise<string[]> {
  const promoCodeCollection = await collection<PromoCode>(COLLECTIONS.promoCodes);
  const codes = new Set<string>();
  const maxAttempts = count * 20;
  let attempts = 0;

  while (codes.size < count && attempts < maxAttempts) {
    attempts += 1;
    const randomSegment = generateRandomCodeSegment(length);
    codes.add(`${prefix}${randomSegment}`);
  }

  if (codes.size < count)
    throw new Error("PROMO_CODE_GENERATION_FAILED");

  const existingCodes = await promoCodeCollection.find({ code: { $in: [...codes] } }).project<{ code: string }>({ code: 1 }).toArray();
  const existingCodeSet = new Set(existingCodes.map(item => item.code));
  const uniqueCodes = [...codes].filter(code => !existingCodeSet.has(code));

  if (uniqueCodes.length < count)
    return generateUniquePromoCodes(count, length, prefix);

  return uniqueCodes.slice(0, count);
}

export const promoCodesModule = new Elysia()
  .get("/api/v2/admin/promo-codes", async ({ request }) => {
    await requireAdmin(request.headers);

    const [codes, recentRedemptions] = await Promise.all([
      (await collection<PromoCode>(COLLECTIONS.promoCodes)).find().sort({ createdAt: -1 }).limit(200).toArray(),
      (await collection<PromoCodeRedemption>(COLLECTIONS.promoCodeRedemptions)).find().sort({ redeemedAt: -1 }).limit(50).toArray(),
    ]);

    return ok<AdminPromoCodeListData>({
      codes: codes.map(serializePromoCode),
      recentRedemptions: recentRedemptions.map(serializePromoCodeRedemption),
    });
  }, { detail: { tags: ["Admin: Promo Codes"], summary: "获取优惠码列表" } })
  .post("/api/v2/admin/promo-codes/generate", async ({ request, body }) => {
    const admin = await requireAdmin(request.headers);
    const now = new Date();
    const count = Math.trunc(body.count);
    const codeLength = Math.trunc(body.codeLength);
    const maxRedemptions = Math.trunc(body.maxRedemptions);
    const perUserMaxRedemptions = Math.trunc(body.perUserMaxRedemptions);
    const startsAt = body.startsAt ? new Date(body.startsAt) : now;
    const endsAt = new Date(body.endsAt);
    const prefix = normalizePromoCodePrefix(body.prefix);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()))
      return { success: false, message: "有效期时间格式无效" };
    if (endsAt <= startsAt)
      return { success: false, message: "结束时间必须晚于开始时间" };
    if (body.discountMultiplier <= 0 || body.discountMultiplier > 1)
      return { success: false, message: "折扣倍率必须在 0 到 1 之间" };

    const codes = await generateUniquePromoCodes(count, codeLength, prefix);
    const documents: PromoCode[] = codes.map(code => ({
      code,
      scope: body.scope as PromoCodeScope,
      discountMultiplier: body.discountMultiplier,
      maxRedemptions,
      perUserMaxRedemptions,
      redeemedCount: 0,
      startsAt,
      endsAt,
      active: body.active,
      description: body.description?.trim() || null,
      createdAt: now,
      updatedAt: now,
    }));

    await (await collection<PromoCode>(COLLECTIONS.promoCodes)).insertMany(documents);
    await insertOne(COLLECTIONS.auditLogs, {
      event: "promo_codes_generated",
      uid: admin.uid,
      createdAt: now,
      metadata: {
        count: documents.length,
        scope: body.scope,
        discountMultiplier: body.discountMultiplier,
        prefix,
      },
    });

    return ok({ codes: documents.map(code => code.code) }, `已生成 ${documents.length} 个优惠码`);
  }, {
    body: t.Object({
      count: t.Number({ minimum: 1, maximum: 100 }),
      codeLength: t.Number({ minimum: 6, maximum: 20 }),
      prefix: t.Optional(t.String({ maxLength: 12 })),
      scope: t.Literal("order_redemption"),
      discountMultiplier: t.Number({ minimum: 0.01, maximum: 1 }),
      maxRedemptions: t.Number({ minimum: 1, maximum: 100000 }),
      perUserMaxRedemptions: t.Number({ minimum: 1, maximum: 100 }),
      startsAt: t.Optional(t.String()),
      endsAt: t.String(),
      active: t.Boolean(),
      description: t.Optional(t.String({ maxLength: 200 })),
    }),
    detail: { tags: ["Admin: Promo Codes"], summary: "生成优惠码" },
  })
  .patch("/api/v2/admin/promo-codes/:code/active", async ({ request, params, body }) => {
    await requireAdmin(request.headers);
    const code = params.code.trim().toUpperCase();
    const updated = await updateOne<PromoCode>(COLLECTIONS.promoCodes, { code }, {
      $set: {
        active: body.active,
        updatedAt: new Date(),
      },
    });

    if (!updated)
      return { success: false, message: "优惠码不存在" };

    return ok(null, body.active ? "优惠码已启用" : "优惠码已停用");
  }, {
    body: t.Object({ active: t.Boolean() }),
    detail: { tags: ["Admin: Promo Codes"], summary: "切换优惠码启用状态" },
  });

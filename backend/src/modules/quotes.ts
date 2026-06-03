import type { PublicQuote, PublicQuoteType } from "@ink-battles/shared/types/common";
import type { DatabaseExcellentSentence } from "@ink-battles/shared/types/database";
import { Elysia, t } from "elysia";
import { collection, COLLECTIONS } from "../db/mongo";

const MAX_PUBLIC_QUOTE_COUNT = 10;

/**
 * 标准化公开名句接口的返回数量。
 */
function normalizeQuoteCount(value: unknown) {
  const count = Number(value ?? 1);
  if (!Number.isFinite(count))
    return 1;
  return Math.min(Math.max(Math.floor(count), 1), MAX_PUBLIC_QUOTE_COUNT);
}

/**
 * 构建公开名句查询条件，确保未授权、未审核或隐藏内容不会进入公开接口。
 */
function buildPublicQuoteFilter(recommend: boolean) {
  return {
    authorizationStatus: "granted",
    reviewStatus: "approved",
    displayStatus: "public",
    ...(recommend ? { recommendationStatus: "recommended" } : {}),
  };
}

/**
 * 转换公开名句响应，只暴露普通用户和一言调用需要的信息。
 */
function serializePublicQuote(sentence: DatabaseExcellentSentence, type: PublicQuoteType): PublicQuote {
  return {
    id: String(sentence._id ?? ""),
    content: sentence.content,
    authorName: sentence.authorName,
    workName: sentence.workName ?? null,
    reason: sentence.metadata?.reason,
    type,
  };
}

/**
 * 名句模块。
 * 独立提供一言式公开调用能力，不混入 public 配置聚合模块。
 */
export const quotesModule = new Elysia()
  .get("/api/v2/quotes", async ({ query }) => {
    const count = normalizeQuoteCount(query.count ?? query.limit);
    const recommend = query.recommend === "true" || query.recommend === true;
    const type = recommend ? "recommended" : "public";

    const sentences = await (await collection<DatabaseExcellentSentence>(COLLECTIONS.excellentSentences)).aggregate<DatabaseExcellentSentence>([
      { $match: buildPublicQuoteFilter(recommend) },
      { $sample: { size: count } },
    ]).toArray();

    return {
      success: true,
      data: {
        quotes: sentences.map(sentence => serializePublicQuote(sentence, type)),
        count: sentences.length,
        type,
      },
    };
  }, {
    query: t.Object({
      recommend: t.Optional(t.Union([t.Boolean(), t.String()])),
      count: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_PUBLIC_QUOTE_COUNT })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_PUBLIC_QUOTE_COUNT })),
    }),
    detail: { tags: ["REST: Quotes"], summary: "随机获取公开名句" },
  });

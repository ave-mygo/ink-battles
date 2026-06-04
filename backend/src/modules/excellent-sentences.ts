import type { AnalysisResult, ExcellentSentenceCandidate } from "@ink-battles/shared/types/ai";
import type { DatabaseExcellentSentence } from "@ink-battles/shared/types/database";
import { Elysia, t } from "elysia";
import { COLLECTIONS, findMany, findOne, insertOne, isObjectId, objectId, updateOne } from "../db/mongo";
import { requireAdmin, requireUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { ok } from "../utils/response";

const NORMALIZE_SENTENCE_REGEX = /[\s\p{P}\p{S}]/gu;
const MAX_SOURCE_FIELD_LENGTH = 80;
const MAX_CUSTOM_SENTENCE_LENGTH = 500;
const CUSTOM_UPLOAD_SOURCE_ARTICLE_ID = "custom-upload";

interface AnalysisRecordDocument extends Record<string, unknown> {
  article?: {
    input?: {
      articleText?: string;
    };
    output?: {
      result?: string | AnalysisResult;
    };
  };
}

type ExcellentSentenceDocument = Omit<DatabaseExcellentSentence, "_id"> & {
  _id?: unknown;
};

/**
 * 生成用于重复检测的句子指纹。
 */
function normalizeSentenceContent(content: string) {
  return content.trim().replace(NORMALIZE_SENTENCE_REGEX, "").toLowerCase();
}

/**
 * 从已落库的分析结果里取出 AI 选择的优秀句子候选。
 */
function parseExcellentSentenceCandidates(record: AnalysisRecordDocument): ExcellentSentenceCandidate[] {
  const rawResult = record.article?.output?.result;
  const parsedResult = typeof rawResult === "string"
    ? JSON.parse(rawResult) as AnalysisResult
    : rawResult as AnalysisResult | undefined;

  return Array.isArray(parsedResult?.excellentSentences)
    ? parsedResult.excellentSentences.filter(candidate =>
        typeof candidate.content === "string"
        && candidate.content.trim().length > 0
        && typeof candidate.reason === "string")
    : [];
}

/**
 * 校验句子是否由 AI 选出，且确实来自该篇文章原文。
 */
function findAuthorizedCandidate(record: AnalysisRecordDocument, content: string) {
  const normalizedContent = normalizeSentenceContent(content);
  const articleText = String(record.article?.input?.articleText ?? "");
  if (!normalizedContent || !normalizeSentenceContent(articleText).includes(normalizedContent)) {
    return null;
  }

  return parseExcellentSentenceCandidates(record).find(candidate =>
    normalizeSentenceContent(candidate.content) === normalizedContent) ?? null;
}

/**
 * 标准化作者和作品来源字段。
 */
function normalizeSourceName(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_SOURCE_FIELD_LENGTH) : fallback.slice(0, MAX_SOURCE_FIELD_LENGTH);
}

/**
 * 格式化收录文档，避免向前端暴露 MongoDB 原始 ObjectId。
 */
function serializeExcellentSentence(sentence: ExcellentSentenceDocument) {
  return {
    ...sentence,
    _id: sentence._id?.toString(),
  };
}

/**
 * 判断 MongoDB 写入错误是否来自唯一索引冲突。
 */
function isDuplicateKeyError(error: unknown) {
  return typeof (error as { code?: number }).code === "number" && (error as { code: number }).code === 11000;
}

export const excellentSentencesModule = new Elysia()
  .get("/api/v2/admin/excellent-sentences", async ({ request, query }) => {
    await requireAdmin(request.headers);
    const reviewStatus = query.reviewStatus && query.reviewStatus !== "all" ? query.reviewStatus : undefined;
    const filter: Record<string, unknown> = {};
    if (reviewStatus)
      filter.reviewStatus = reviewStatus;

    const sentences = await findMany<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, filter, {
      sort: { createdAt: -1 },
      limit: Math.min(Number(query.limit ?? 50) || 50, 100),
    });

    return ok(sentences.map(serializeExcellentSentence));
  }, {
    query: t.Object({
      reviewStatus: t.Optional(t.String({ enum: ["all", "pending", "approved", "rejected"] })),
      limit: t.Optional(t.Numeric()),
    }),
    detail: { tags: ["REST: Admin"] },
  })
  .patch("/api/v2/admin/excellent-sentences/:id", async ({ request, params, body }) => {
    const admin = await requireAdmin(request.headers);
    if (!isObjectId(params.id))
      return { success: false, message: "句子记录不存在" };

    const before = await findOne<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, { _id: objectId(params.id) });
    if (!before)
      return { success: false, message: "句子记录不存在" };

    const now = new Date().toISOString();
    await updateOne<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, { _id: objectId(params.id) }, {
      reviewStatus: body.reviewStatus,
      recommendationStatus: body.recommendationStatus,
      displayStatus: body.displayStatus,
      reviewerUid: admin.uid,
      reviewedAt: now,
      updatedAt: now,
    });

    writeAuditLog({
      event: "excellent_sentence_reviewed",
      uid: admin.uid,
      ip: getRequestIp(request),
      userAgent: getRequestUserAgent(request),
      metadata: {
        sentenceId: params.id,
        before: {
          reviewStatus: before.reviewStatus,
          recommendationStatus: before.recommendationStatus,
          displayStatus: before.displayStatus,
        },
        after: body,
      },
    });

    return { success: true, message: "审核状态已更新" };
  }, {
    body: t.Object({
      reviewStatus: t.String({ enum: ["pending", "approved", "rejected"] }),
      recommendationStatus: t.String({ enum: ["none", "candidate", "recommended"] }),
      displayStatus: t.String({ enum: ["hidden", "public"] }),
    }),
    detail: { tags: ["REST: Admin"] },
  })
  .get("/api/v2/excellent-sentences/source/:sourceArticleId", async ({ request, params }) => {
    const user = await requireUser(request.headers);
    if (!isObjectId(params.sourceArticleId))
      return { success: false, message: "分析记录不存在" };

    const record = await findOne<AnalysisRecordDocument>(COLLECTIONS.analysisRequests, { _id: objectId(params.sourceArticleId), uid: user.uid });
    if (!record)
      return { success: false, message: "分析记录不存在或无权访问" };

    const sentences = await findMany<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, {
      sourceArticleId: params.sourceArticleId,
      uid: user.uid,
      authorizationStatus: "granted",
    }, {
      sort: { createdAt: -1 },
    });

    return ok({
      sentences: sentences.map(serializeExcellentSentence),
      normalizedContents: sentences.map(sentence => sentence.normalizedContent),
    });
  }, { detail: { tags: ["REST: Excellent Sentences"] } })
  .post("/api/v2/excellent-sentences", async ({ request, body }) => {
    const user = await requireUser(request.headers);
    if (!body.authorizationGranted)
      return { success: false, message: "请先授权平台收录优秀句子" };
    if (!isObjectId(body.sourceArticleId))
      return { success: false, message: "分析记录不存在" };

    const record = await findOne<AnalysisRecordDocument>(COLLECTIONS.analysisRequests, { _id: objectId(body.sourceArticleId), uid: user.uid });
    if (!record)
      return { success: false, message: "分析记录不存在或无权访问" };

    const candidate = findAuthorizedCandidate(record, body.content);
    if (!candidate)
      return { success: false, message: "该句子不是 AI 为当前文章选出的可收录句子" };

    const now = new Date().toISOString();
    const normalizedContent = normalizeSentenceContent(candidate.content);
    const existing = await findOne<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, {
      normalizedContent,
      authorizationStatus: "granted",
    });
    if (existing)
      return { success: false, message: "该句子已被收录，请勿重复提交" };

    const authorName = normalizeSourceName(body.authorName, user.nickname || user.email?.split("@")[0] || `用户${user.uid}`);
    const workName = body.workName?.trim()
      ? body.workName.trim().slice(0, MAX_SOURCE_FIELD_LENGTH)
      : null;

    try {
      await insertOne<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, {
        content: candidate.content.trim(),
        normalizedContent,
        sourceArticleId: body.sourceArticleId,
        uid: user.uid,
        authorName,
        workName,
        authorizationStatus: "granted",
        reviewStatus: "pending",
        recommendationStatus: "none",
        displayStatus: "hidden",
        metadata: {
          reason: candidate.reason,
        },
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (isDuplicateKeyError(error))
        return { success: false, message: "该句子已被收录，请勿重复提交" };
      throw error;
    }

    return { success: true, message: "优秀句子已提交收录，等待审核后可用于站内展示" };
  }, {
    body: t.Object({
      content: t.String({ minLength: 1, maxLength: 500 }),
      sourceArticleId: t.String({ minLength: 1, maxLength: 64 }),
      authorName: t.Optional(t.String({ maxLength: MAX_SOURCE_FIELD_LENGTH })),
      workName: t.Optional(t.String({ maxLength: MAX_SOURCE_FIELD_LENGTH })),
      authorizationGranted: t.Boolean(),
    }),
    detail: { tags: ["REST: Excellent Sentences"] },
  })
  .post("/api/v2/excellent-sentences/custom", async ({ request, body }) => {
    const user = await requireUser(request.headers);
    if (!body.authorizationGranted)
      return { success: false, message: "请先授权平台收录该句子" };

    const content = body.content.trim();
    if (!content)
      return { success: false, message: "句子内容不能为空" };

    const normalizedContent = normalizeSentenceContent(content);
    const existing = await findOne<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, {
      normalizedContent,
      authorizationStatus: "granted",
    });
    if (existing)
      return { success: false, message: "该句子已被收录，请勿重复提交" };

    const now = new Date().toISOString();
    const authorName = normalizeSourceName(body.authorName, user.nickname || user.email?.split("@")[0] || `用户${user.uid}`);
    const workName = body.workName?.trim()
      ? body.workName.trim().slice(0, MAX_SOURCE_FIELD_LENGTH)
      : null;
    const reason = body.reason?.trim()
      ? body.reason.trim().slice(0, 200)
      : undefined;

    try {
      await insertOne<ExcellentSentenceDocument>(COLLECTIONS.excellentSentences, {
        content,
        normalizedContent,
        sourceArticleId: CUSTOM_UPLOAD_SOURCE_ARTICLE_ID,
        uid: user.uid,
        authorName,
        workName,
        authorizationStatus: "granted",
        reviewStatus: "pending",
        recommendationStatus: "none",
        displayStatus: "hidden",
        metadata: {
          reason,
          sourceType: "custom_upload",
        },
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (isDuplicateKeyError(error))
        return { success: false, message: "该句子已被收录，请勿重复提交" };
      throw error;
    }

    return { success: true, message: "句子已提交，审核通过后可用于站内展示" };
  }, {
    body: t.Object({
      content: t.String({ minLength: 1, maxLength: MAX_CUSTOM_SENTENCE_LENGTH }),
      authorName: t.Optional(t.String({ maxLength: MAX_SOURCE_FIELD_LENGTH })),
      workName: t.Optional(t.String({ maxLength: MAX_SOURCE_FIELD_LENGTH })),
      reason: t.Optional(t.String({ maxLength: 200 })),
      authorizationGranted: t.Boolean(),
    }),
    detail: { tags: ["REST: Excellent Sentences"] },
  });

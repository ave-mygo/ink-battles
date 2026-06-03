import type { DatabaseExcellentSentence } from "@ink-battles/shared/types/database";
import type { AnalysisResult, ExcellentSentenceCandidate } from "@ink-battles/shared/types/ai";
import { Elysia, t } from "elysia";
import { COLLECTIONS, findMany, findOne, insertOne, isObjectId, objectId } from "../db/mongo";
import { requireUser } from "../middleware/auth";
import { ok } from "../utils/response";

const NORMALIZE_SENTENCE_REGEX = /[\s\p{P}\p{S}]/gu;
const MAX_SOURCE_FIELD_LENGTH = 80;

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
function serializeExcellentSentence(sentence: DatabaseExcellentSentence) {
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
  .get("/api/v2/excellent-sentences/source/:sourceArticleId", async ({ request, params }) => {
    const user = await requireUser(request.headers);
    if (!isObjectId(params.sourceArticleId))
      return { success: false, message: "分析记录不存在" };

    const record = await findOne<AnalysisRecordDocument>(COLLECTIONS.analysisRequests, { _id: objectId(params.sourceArticleId), uid: user.uid });
    if (!record)
      return { success: false, message: "分析记录不存在或无权访问" };

    const sentences = await findMany<DatabaseExcellentSentence>(COLLECTIONS.excellentSentences, {
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
    const existing = await findOne<DatabaseExcellentSentence>(COLLECTIONS.excellentSentences, {
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
      await insertOne<DatabaseExcellentSentence>(COLLECTIONS.excellentSentences, {
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
  });

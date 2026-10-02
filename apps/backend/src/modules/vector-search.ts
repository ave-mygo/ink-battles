import type {
  SentenceSearchResponse,
  VectorSearchModelAdminConfig,
  VectorSearchSetting,
} from "@ink-battles/shared/types/common";
import type { DatabaseExcellentSentence, DatabaseSentenceVector } from "@ink-battles/shared/types/database";
import type { WithId } from "mongodb";
import { Elysia, t } from "elysia";
import OpenAI from "openai";
import { getConfig } from "../config";
import { collection, COLLECTIONS, findMany, findOneAndUpdate, isObjectId, objectId } from "../db/mongo";
import { requireAdmin } from "../middleware/auth";
import { ok } from "../utils/response";
import { getCachedEffectiveVectorSearchSetting, getEffectiveVectorSearchSetting, getSiteSettingValue } from "./site-settings";

const MAX_SEARCH_LIMIT = 20;
const MAX_REBUILD_BATCH_SIZE = 500;
const IMAGE_DATA_URL_REGEX = /^data:image\/(?:png|jpeg|jpg|webp);base64,/u;

interface EmbeddingRuntimeModel extends VectorSearchModelAdminConfig {
  api_key: string;
  base_url: string;
}

interface RerankRuntimeModel {
  id: string;
  name: string;
  model: string;
  api_key: string;
  base_url: string;
}

interface SearchInput {
  queryType: "text" | "image";
  text?: string;
  imageDataUrl?: string;
  tags?: string[];
  authorName?: string;
  workName?: string;
  limit?: number;
}

interface VectorSearchCandidate {
  sentence: WithId<ExcellentSentenceVectorDocument>;
  vector: WithId<DatabaseSentenceVector>;
}

type ExcellentSentenceVectorDocument = Omit<DatabaseExcellentSentence, "_id"> & {
  _id?: unknown;
};

/**
 * 读取向量检索模型的有效配置。
 *
 * 数据库存储启用状态和权重，config.toml 始终提供真实 model/base_url/api_key。
 */
function getRuntimeEmbeddingModel(setting: VectorSearchSetting, modelId: string, capability: "text" | "image"): EmbeddingRuntimeModel | null {
  const dynamicModel = setting.models.find(model => model.id === modelId && model.capabilities.includes(capability));
  const configModel = getConfig().system_models.embedding;
  if (!configModel)
    return null;
  if (!dynamicModel)
    return null;
  if (dynamicModel.model !== configModel.model)
    return null;

  return {
    ...dynamicModel,
    api_key: configModel.api_key,
    base_url: configModel.base_url,
    model: configModel.model,
    dimensions: dynamicModel.dimensions,
  };
}

/**
 * 读取重排模型的有效配置。
 */
function getRuntimeRerankModel(setting: VectorSearchSetting): RerankRuntimeModel | null {
  if (!setting.rerankEnabled)
    return null;

  const dynamicModel = setting.rerankModels.find(model => model.id === setting.activeRerankModelId);
  const configModel = getConfig().system_models.rerank;
  if (!configModel)
    return null;
  if (!dynamicModel || dynamicModel.model !== configModel.model)
    return null;

  return {
    id: dynamicModel.id,
    name: dynamicModel.name,
    model: configModel.model,
    api_key: configModel.api_key,
    base_url: configModel.base_url,
  };
}

/**
 * 对向量做 L2 归一化，保证不同 provider 返回的幅度不会影响余弦相似度。
 */
function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0)
    throw new Error("INVALID_EMBEDDING_VECTOR");
  return vector.map(value => value / magnitude);
}

/**
 * 调用 OpenAI-compatible embeddings API 生成文本或图片查询向量。
 */
async function createEmbedding(model: EmbeddingRuntimeModel, input: { text?: string; imageDataUrl?: string }) {
  const client = new OpenAI({ apiKey: model.api_key, baseURL: model.base_url });
  const embeddingInput = input.imageDataUrl ?? input.text ?? "";
  const response = await client.embeddings.create({
    model: model.model,
    input: embeddingInput,
    ...(model.dimensions ? { dimensions: model.dimensions } : {}),
  });
  const vector = response.data[0]?.embedding;
  if (!vector?.length)
    throw new Error("EMBEDDING_EMPTY");
  return normalizeVector(vector);
}

/**
 * 计算两个已归一化向量的余弦相似度。
 */
function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1)
    score += left[index] * right[index];
  return score;
}

/**
 * 获取句子的可搜索标签。
 */
function getSentenceTags(sentence: ExcellentSentenceVectorDocument) {
  return Array.isArray(sentence.metadata?.tags)
    ? sentence.metadata.tags.map(tag => tag.trim()).filter(Boolean)
    : [];
}

/**
 * 计算作者、作品和标签的轻量匹配加分。
 */
function getMetadataScore(sentence: ExcellentSentenceVectorDocument, input: SearchInput) {
  let score = 0;
  const sentenceTags = new Set(getSentenceTags(sentence).map(tag => tag.toLowerCase()));
  const queryTags = (input.tags ?? []).map(tag => tag.trim().toLowerCase()).filter(Boolean);
  if (queryTags.length > 0) {
    const matchedTags = queryTags.filter(tag => sentenceTags.has(tag)).length;
    score += matchedTags / queryTags.length;
  }
  if (input.authorName && sentence.authorName.includes(input.authorName.trim()))
    score += 0.6;
  if (input.workName && sentence.workName?.includes(input.workName.trim()))
    score += 0.6;
  return Math.min(score, 1);
}

interface RerankApiResult {
  index?: number;
  relevance_score?: number;
  score?: number;
}

interface RerankApiResponse {
  results?: RerankApiResult[];
}

/**
 * 调用文本重排模型，对向量召回候选进行第二轮精排。
 */
async function rerankSentenceCandidates(model: RerankRuntimeModel, query: string, documents: string[]) {
  if (documents.length === 0)
    return new Map<number, number>();

  const endpoint = `${model.base_url.replace(/\/$/, "")}/rerank`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${model.api_key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model.model,
      query,
      documents,
      top_n: documents.length,
    }),
  });
  if (!response.ok)
    throw new Error(`RERANK_FAILED_${response.status}`);

  const payload = await response.json() as RerankApiResponse;
  const scores = new Map<number, number>();
  for (const item of payload.results ?? []) {
    if (typeof item.index !== "number")
      continue;
    const score = Number(item.relevance_score ?? item.score);
    if (Number.isFinite(score))
      scores.set(item.index, Math.max(0, Math.min(1, score)));
  }
  return scores;
}

/**
 * 将优秀文句写入向量库，审核通过、模型切换和重建索引都会复用这条路径。
 */
export async function upsertExcellentSentenceVector(sentence: ExcellentSentenceVectorDocument, modelId?: string) {
  const setting = getCachedEffectiveVectorSearchSetting();
  if (!setting.enabled)
    return { success: false, reason: "disabled" };

  const targetModelId = modelId ?? setting.activeEmbeddingModelId;
  const model = getRuntimeEmbeddingModel(setting, targetModelId, "text");
  if (!model)
    return { success: false, reason: "model_not_configured" };

  const now = new Date().toISOString();
  try {
    const vector = await createEmbedding(model, { text: sentence.content });
    await findOneAndUpdate<DatabaseSentenceVector>(COLLECTIONS.sentenceVectors, {
      sentenceId: String(sentence._id ?? ""),
      modelId: model.id,
    }, {
      $set: {
        sentenceId: String(sentence._id ?? ""),
        content: sentence.content,
        vector,
        modelId: model.id,
        model: model.model,
        dimensions: vector.length,
        status: "ready",
        error: null,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    }, { upsert: true });
    return { success: true };
  } catch (error) {
    await findOneAndUpdate<DatabaseSentenceVector>(COLLECTIONS.sentenceVectors, {
      sentenceId: String(sentence._id ?? ""),
      modelId: model.id,
    }, {
      $set: {
        sentenceId: String(sentence._id ?? ""),
        content: sentence.content,
        vector: [],
        modelId: model.id,
        model: model.model,
        dimensions: 0,
        status: "failed",
        error: error instanceof Error ? error.message : "UNKNOWN_EMBEDDING_ERROR",
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    }, { upsert: true });
    return { success: false, reason: "embedding_failed" };
  }
}

/**
 * 重建当前向量模型下的优秀文句向量。
 */
async function rebuildSentenceVectors(limit = MAX_REBUILD_BATCH_SIZE) {
  const sentences = await findMany<ExcellentSentenceVectorDocument>(COLLECTIONS.excellentSentences, {
    authorizationStatus: "granted",
    reviewStatus: "approved",
  }, {
    sort: { updatedAt: -1 },
    limit: Math.min(Math.max(limit, 1), MAX_REBUILD_BATCH_SIZE),
  });

  let succeeded = 0;
  let failed = 0;
  for (const sentence of sentences) {
    const result = await upsertExcellentSentenceVector(sentence);
    if (result.success)
      succeeded += 1;
    else
      failed += 1;
  }
  return { total: sentences.length, succeeded, failed };
}

/**
 * 聚合当前模型下可检索的句子和向量。
 */
async function listVectorCandidates(modelId: string): Promise<VectorSearchCandidate[]> {
  const vectors = await findMany<DatabaseSentenceVector>(COLLECTIONS.sentenceVectors, {
    modelId,
    status: "ready",
  }, { limit: 5000 });
  const sentenceObjectIds = vectors.map(vector => vector.sentenceId).filter(isObjectId).map(objectId);
  const sentenceFilter = {
    _id: { $in: sentenceObjectIds },
    authorizationStatus: "granted",
    reviewStatus: "approved",
  } as Record<string, unknown>;
  const sentences = await findMany<ExcellentSentenceVectorDocument>(COLLECTIONS.excellentSentences, sentenceFilter);
  const sentenceMap = new Map(sentences.map(sentence => [String(sentence._id ?? ""), sentence]));
  const candidates: VectorSearchCandidate[] = [];
  for (const vector of vectors) {
    const sentence = sentenceMap.get(vector.sentenceId);
    if (sentence)
      candidates.push({ vector, sentence });
  }
  return candidates;
}

/**
 * 从优秀文句向量库中做相似度检索，并合并业务权重排序。
 */
async function searchSentences(input: SearchInput): Promise<SentenceSearchResponse> {
  const setting = await getEffectiveVectorSearchSetting();
  if (!setting.enabled)
    throw new Error("VECTOR_SEARCH_DISABLED");

  const queryType = input.queryType;
  const modelId = setting.activeEmbeddingModelId;
  const model = getRuntimeEmbeddingModel(setting, modelId, queryType);
  if (!model)
    throw new Error("VECTOR_MODEL_NOT_CONFIGURED");

  const queryVector = await createEmbedding(model, {
    text: input.text,
    imageDataUrl: input.imageDataUrl,
  });
  const honoraryWriters = await getSiteSettingValue("content.honoraryWriters");
  const honoraryWriterUids = new Set(honoraryWriters.uids);
  const candidates = await listVectorCandidates(model.id);
  const limit = Math.min(Math.max(input.limit ?? setting.topK, 1), MAX_SEARCH_LIMIT);
  const rerankModel = queryType === "text" && input.text?.trim() ? getRuntimeRerankModel(setting) : null;
  const rerankCandidateLimit = Math.max(limit, Math.min(setting.rerankCandidateLimit, candidates.length));

  const baseResults = candidates.map(({ sentence, vector }) => {
    const similarity = cosineSimilarity(queryVector, vector.vector);
    const metadataScore = getMetadataScore(sentence, input);
    const isRecommended = sentence.recommendationStatus === "recommended";
    const isHonoraryWriter = honoraryWriterUids.has(sentence.uid);
    const score = similarity * setting.similarityWeight
      + metadataScore * setting.metadataWeight
      + (isRecommended ? setting.recommendationWeight : 0)
      + (isHonoraryWriter ? setting.honoraryWriterWeight : 0);

    return {
      id: String(sentence._id ?? ""),
      content: sentence.content,
      authorName: sentence.authorName,
      workName: sentence.workName ?? null,
      reason: sentence.metadata?.reason,
      tags: getSentenceTags(sentence),
      similarity,
      rerankScore: null,
      score,
      isRecommended,
      isHonoraryWriter,
    };
  })
    .filter(result => result.similarity >= setting.minSimilarity)
    .sort((left, right) => right.score - left.score)
    .slice(0, rerankModel ? rerankCandidateLimit : limit);

  const results = rerankModel
    ? await (async () => {
        try {
          const rerankScores = await rerankSentenceCandidates(
            rerankModel,
            input.text?.trim() ?? "",
            baseResults.map(result => result.content),
          );
          return baseResults
            .map((result, index) => {
              const rerankScore = rerankScores.get(index) ?? null;
              return {
                ...result,
                rerankScore,
                score: result.score + (rerankScore ?? 0) * setting.rerankWeight,
              };
            })
            .sort((left, right) => right.score - left.score)
            .slice(0, limit);
        } catch (error) {
          console.warn("[vector-search] rerank failed, fallback to vector ranking", error);
          return baseResults.slice(0, limit);
        }
      })()
    : baseResults;

  return {
    results,
    count: results.length,
    queryType,
    modelId: model.id,
    rerankModelId: rerankModel?.id ?? null,
  };
}

/**
 * 向量检索模块。
 */
export const vectorSearchModule = new Elysia()
  .post("/api/v2/sentences/search", async ({ body }) => {
    const input = body as SearchInput;
    if (input.queryType === "image" && (!input.imageDataUrl || !IMAGE_DATA_URL_REGEX.test(input.imageDataUrl)))
      return { success: false, message: "请上传 PNG、JPG 或 WebP 图片" };
    if (input.queryType === "text" && !input.text?.trim())
      return { success: false, message: "请输入要搜索的文段" };

    return ok(await searchSentences(input));
  }, {
    body: t.Object({
      queryType: t.String({ enum: ["text", "image"] }),
      text: t.Optional(t.String({ maxLength: 2000 })),
      imageDataUrl: t.Optional(t.String({ maxLength: 8 * 1024 * 1024 })),
      tags: t.Optional(t.Array(t.String({ maxLength: 40 }), { maxItems: 10 })),
      authorName: t.Optional(t.String({ maxLength: 80 })),
      workName: t.Optional(t.String({ maxLength: 80 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_SEARCH_LIMIT })),
    }),
    detail: { tags: ["REST: Sentences"], summary: "按文本或图片语义检索优秀文句" },
  })
  .get("/api/v2/admin/vector-search/status", async ({ request }) => {
    await requireAdmin(request.headers);
    const [ready, failed, totalSentences] = await Promise.all([
      (await collection<DatabaseSentenceVector>(COLLECTIONS.sentenceVectors)).countDocuments({ status: "ready" }),
      (await collection<DatabaseSentenceVector>(COLLECTIONS.sentenceVectors)).countDocuments({ status: "failed" }),
      (await collection<DatabaseExcellentSentence>(COLLECTIONS.excellentSentences)).countDocuments({ authorizationStatus: "granted", reviewStatus: "approved" }),
    ]);
    return ok({ ready, failed, totalSentences });
  }, { detail: { tags: ["REST: Admin"] } })
  .post("/api/v2/admin/vector-search/rebuild", async ({ request, body }) => {
    await requireAdmin(request.headers);
    const result = await rebuildSentenceVectors(Number((body as { limit?: number }).limit ?? MAX_REBUILD_BATCH_SIZE));
    return ok(result, "向量索引重建已完成");
  }, {
    body: t.Object({
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_REBUILD_BATCH_SIZE })),
    }),
    detail: { tags: ["REST: Admin"], summary: "重建优秀文句向量索引" },
  });

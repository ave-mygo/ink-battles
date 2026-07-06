import type { AuthorStyleFeatureProfile, AuthorStyleLibraryItem, AuthorStyleLibrarySaveInput } from "@ink-battles/shared/types/common";
import type { DatabaseAuthorStyle, DatabaseAuthorStyleVector } from "@ink-battles/shared/types/database";
import type { WithId } from "mongodb";
import { Elysia, t } from "elysia";
import { ObjectId } from "mongodb";
import OpenAI from "openai";
import { getConfig } from "../config";
import { collection, COLLECTIONS, deleteOne, findMany, findOne, findOneAndUpdate, insertOne, isObjectId, objectId, updateOne } from "../db/mongo";
import { requireAdmin } from "../middleware/auth";
import { parseModelOutput } from "../utils/json-parser";
import { ok } from "../utils/response";
import { getCachedEffectiveGradingModelById, getCachedEffectiveVectorSearchSetting, getCachedPublicGradingModels, getCachedSiteSettingValue, getEffectiveVectorSearchSetting, getSiteSettingValue } from "./site-settings";

const MAX_REPRESENTATIVE_TEXTS = 8;
const MAX_REPRESENTATIVE_WORKS = 12;
const MAX_REPRESENTATIVE_WORK_CHARS = 1000;
const MAX_REBUILD_BATCH_SIZE = 200;
const MAX_STYLE_TEXT_CHARS = 12000;

interface EmbeddingRuntimeModel {
  id: string;
  name: string;
  model: string;
  dimensions?: number;
  api_key: string;
  base_url: string;
}

interface AuthorStyleCandidate {
  style: WithId<DatabaseAuthorStyle>;
  vector: WithId<DatabaseAuthorStyleVector>;
}

interface StyleMatchResult {
  authorId: string;
  name: string;
  styleLabel: string;
  description: string;
  confidence: number;
  similarity: number;
  source: "library";
  reasons: string[];
}

interface ArticleStyleMatchResult {
  articleProfile: AuthorStyleFeatureProfile | null;
  matches: StyleMatchResult[];
}

type AuthorStyleBackgroundJob = () => Promise<void>;

const authorStyleBackgroundJobs: AuthorStyleBackgroundJob[] = [];
let runningAuthorStyleJobs = 0;
const MAX_AUTHOR_STYLE_BACKGROUND_JOBS = 1;

/**
 * 将作者风格相关的重任务放入后台队列，避免管理请求或分析完成链路同步等待 AI 调用。
 */
function enqueueAuthorStyleJob(job: AuthorStyleBackgroundJob): void {
  authorStyleBackgroundJobs.push(job);
  queueMicrotask(drainAuthorStyleJobs);
}

/**
 * 串行处理作者风格后台任务，降低风格抽取和 embedding 对主分析队列的冲击。
 */
function drainAuthorStyleJobs(): void {
  while (runningAuthorStyleJobs < MAX_AUTHOR_STYLE_BACKGROUND_JOBS && authorStyleBackgroundJobs.length > 0) {
    const job = authorStyleBackgroundJobs.shift();
    if (!job)
      return;

    runningAuthorStyleJobs++;
    queueMicrotask(async () => {
      try {
        await job();
      } catch (error) {
        console.error("[author-styles] background job failed", error);
      } finally {
        runningAuthorStyleJobs--;
        drainAuthorStyleJobs();
      }
    });
  }
}

/**
 * 对向量做 L2 归一化，保证不同 provider 的向量幅度不会干扰余弦相似度。
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0)
    throw new Error("INVALID_EMBEDDING_VECTOR");
  return vector.map(value => value / magnitude);
}

/**
 * 计算两个已归一化向量的余弦相似度。
 */
function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1)
    score += left[index] * right[index];
  return score;
}

/**
 * 从现有向量检索配置中读取作者风格库可复用的 embedding 运行时凭据。
 */
function getRuntimeEmbeddingModel(): EmbeddingRuntimeModel | null {
  const setting = getCachedEffectiveVectorSearchSetting();
  const dynamicModel = setting.models.find(model => model.id === setting.activeEmbeddingModelId && model.capabilities.includes("text"));
  const configModel = getConfig().system_models.embedding;
  if (!configModel || !dynamicModel || dynamicModel.model !== configModel.model)
    return null;

  return {
    id: dynamicModel.id,
    name: dynamicModel.name,
    model: configModel.model,
    dimensions: dynamicModel.dimensions,
    api_key: configModel.api_key,
    base_url: configModel.base_url,
  };
}

/**
 * 调用 OpenAI-compatible embeddings API 生成文本向量。
 */
async function createEmbedding(model: EmbeddingRuntimeModel, text: string): Promise<number[]> {
  const client = new OpenAI({ apiKey: model.api_key, baseURL: model.base_url });
  const response = await client.embeddings.create({
    model: model.model,
    input: text,
    ...(model.dimensions ? { dimensions: model.dimensions } : {}),
  });
  const vector = response.data[0]?.embedding;
  if (!vector?.length)
    throw new Error("EMBEDDING_EMPTY");
  return normalizeVector(vector);
}

/**
 * 选择一个已启用的评分模型承担风格特征抽取任务。
 */
function getStyleAnalysisModel() {
  const publicModel = getCachedPublicGradingModels()[0];
  if (!publicModel)
    return null;
  return getCachedEffectiveGradingModelById(publicModel.id ?? publicModel.model);
}

/**
 * 将模型返回的风格特征规整为稳定结构，避免脏输出污染作者库。
 */
function normalizeFeatureProfile(input: Partial<AuthorStyleFeatureProfile>): AuthorStyleFeatureProfile {
  const toList = (value: unknown, limit: number) => Array.isArray(value)
    ? value.map(item => String(item).trim()).filter(Boolean).slice(0, limit)
    : [];
  const legacyCoreExpression = input.spiritualCore ?? input.emotionalTendency ?? "";
  return {
    storyContent: String(input.storyContent ?? input.narrativeMode ?? "").slice(0, 400),
    coreExpression: String(input.coreExpression ?? legacyCoreExpression).slice(0, 400),
    genreType: String(input.genreType ?? "").slice(0, 160),
    languageHabits: toList(input.languageHabits, 8),
    sentenceStructures: toList(input.sentenceStructures, 8),
    expressionRhythm: String(input.expressionRhythm ?? "").slice(0, 300),
    imageryPreferences: toList(input.imageryPreferences, 8),
    styleLabel: String(input.styleLabel ?? "").slice(0, 80),
    summary: String(input.summary ?? "").slice(0, 700),
    keywords: toList(input.keywords, 12),
  };
}

/**
 * 将作者资料和样本文本合成为风格抽取输入。
 */
function buildStyleSourceText(input: AuthorStyleLibrarySaveInput): string {
  const pieces = [
    input.styleIntro ? `风格简介：${input.styleIntro}` : "",
    input.representativeWorks?.length ? `代表作品：${input.representativeWorks.join("、")}` : "",
    ...input.representativeTexts.map((text, index) => `样本文案 ${index + 1}：\n${text}`),
  ].filter(Boolean);
  return pieces.join("\n\n").slice(0, MAX_STYLE_TEXT_CHARS);
}

/**
 * 调用评分模型抽取风格特征，维度覆盖故事内容、核心表达、体裁类型与语言层面的稳定特征。
 */
async function extractStyleFeatures(input: AuthorStyleLibrarySaveInput): Promise<AuthorStyleFeatureProfile> {
  const model = getStyleAnalysisModel();
  if (!model)
    throw new Error("STYLE_ANALYSIS_MODEL_NOT_CONFIGURED");

  const generationConfig = getCachedSiteSettingValue("ai.generation");
  const client = new OpenAI({ apiKey: model.api_key, baseURL: model.base_url });
  const response = await client.chat.completions.create({
    model: model.model,
    temperature: model.model.includes("gpt-5-nano") ? generationConfig.gpt5_nano_temperature : generationConfig.default_temperature,
    ...(generationConfig.enable_json_mode_when_supported && model.supports_json_mode !== false ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      {
        role: "system",
        content: [
          "你是文学风格分析师。请仅输出 JSON 对象。",
          "字段必须包含 storyContent, coreExpression, genreType, languageHabits, sentenceStructures, expressionRhythm, imageryPreferences, styleLabel, summary, keywords。",
          "storyContent 用于概括故事写了什么、主要关系和冲突；coreExpression 用于概括作品想表达什么；genreType 用于标注体裁、题材或类型。",
          "languageHabits、sentenceStructures、imageryPreferences、keywords 必须是字符串数组，其余字段为中文字符串。",
        ].join("\n"),
      },
      {
        role: "user",
        content: `作者：${input.authorName}\n\n${buildStyleSourceText(input)}`,
      },
    ],
  });
  const content = response.choices[0]?.message.content ?? "";
  const parsed = parseModelOutput<Partial<AuthorStyleFeatureProfile>>(content);
  if (!parsed.ok || !parsed.data)
    throw new Error(`STYLE_FEATURE_PARSE_FAILED: ${parsed.warnings.join(", ")}`);
  return normalizeFeatureProfile(parsed.data);
}

/**
 * 将结构化风格特征转换成稳定的 embedding 文本。
 */
function buildFeatureEmbeddingText(authorName: string, profile: AuthorStyleFeatureProfile): string {
  return [
    `作者：${authorName}`,
    `风格标签：${profile.styleLabel}`,
    `故事内容：${profile.storyContent}`,
    `核心表达：${profile.coreExpression}`,
    `体裁类型：${profile.genreType}`,
    `语言习惯：${profile.languageHabits.join("；")}`,
    `句式结构：${profile.sentenceStructures.join("；")}`,
    `表达节奏：${profile.expressionRhythm}`,
    `意象偏好：${profile.imageryPreferences.join("；")}`,
    `关键词：${profile.keywords.join("；")}`,
    `简介：${profile.summary}`,
  ].filter(Boolean).join("\n");
}

/**
 * 序列化作者风格库记录给前端使用。
 */
function serializeAuthorStyle(style: WithId<DatabaseAuthorStyle>): AuthorStyleLibraryItem {
  return {
    id: style._id.toString(),
    authorName: style.authorName,
    bio: style.bio,
    representativeWorks: style.representativeWorks,
    representativeTexts: style.representativeTexts,
    styleIntro: style.styleIntro,
    featureProfile: style.featureProfile,
    vectorStatus: style.vectorStatus,
    vectorModelId: style.vectorModelId ?? null,
    vectorUpdatedAt: style.vectorUpdatedAt ?? null,
    vectorError: style.vectorError ?? null,
    createdAt: style.createdAt,
    updatedAt: style.updatedAt,
  };
}

/**
 * 规整管理端保存的作者资料输入。
 */
function normalizeAuthorStyleInput(input: AuthorStyleLibrarySaveInput): AuthorStyleLibrarySaveInput {
  return {
    authorName: input.authorName.trim().slice(0, 80),
    bio: String(input.bio ?? "").trim().slice(0, 1000),
    representativeWorks: (input.representativeWorks ?? []).map(item => item.trim().slice(0, MAX_REPRESENTATIVE_WORK_CHARS)).filter(Boolean).slice(0, MAX_REPRESENTATIVE_WORKS),
    representativeTexts: input.representativeTexts.map(item => item.trim()).filter(Boolean).slice(0, MAX_REPRESENTATIVE_TEXTS),
    styleIntro: String(input.styleIntro ?? "").trim().slice(0, 2000),
  };
}

/**
 * 为作者风格记录抽取特征并写入向量库。
 */
async function rebuildAuthorStyleVector(styleId: string): Promise<{ success: boolean; error?: string }> {
  if (!isObjectId(styleId))
    return { success: false, error: "INVALID_AUTHOR_STYLE_ID" };

  await getEffectiveVectorSearchSetting();
  const model = getRuntimeEmbeddingModel();
  if (!model)
    return { success: false, error: "EMBEDDING_MODEL_NOT_CONFIGURED" };

  const style = await findOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(styleId) });
  if (!style)
    return { success: false, error: "AUTHOR_STYLE_NOT_FOUND" };

  const now = new Date().toISOString();
  try {
    const featureProfile = await extractStyleFeatures(style);
    const vector = await createEmbedding(model, buildFeatureEmbeddingText(style.authorName, featureProfile));
    await findOneAndUpdate<DatabaseAuthorStyleVector>(COLLECTIONS.authorStyleVectors, {
      authorStyleId: styleId,
      modelId: model.id,
    }, {
      $set: {
        authorStyleId: styleId,
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
    await updateOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(styleId) }, {
      $set: {
        featureProfile,
        vectorStatus: "ready",
        vectorModelId: model.id,
        vectorUpdatedAt: now,
        vectorError: null,
        updatedAt: now,
      },
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_AUTHOR_STYLE_VECTOR_ERROR";
    await updateOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(styleId) }, {
      $set: {
        vectorStatus: "failed",
        vectorModelId: model.id,
        vectorUpdatedAt: now,
        vectorError: message,
        updatedAt: now,
      },
    });
    await findOneAndUpdate<DatabaseAuthorStyleVector>(COLLECTIONS.authorStyleVectors, {
      authorStyleId: styleId,
      modelId: model.id,
    }, {
      $set: {
        authorStyleId: styleId,
        vector: [],
        modelId: model.id,
        model: model.model,
        dimensions: 0,
        status: "failed",
        error: message,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    }, { upsert: true });
    return { success: false, error: message };
  }
}

/**
 * 标记作者风格记录为待处理，并在后台重建风格特征和向量。
 */
export async function enqueueAuthorStyleVectorRebuild(styleId: string): Promise<void> {
  if (!isObjectId(styleId))
    return;

  await updateOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(styleId) }, {
    $set: {
      vectorStatus: "pending",
      vectorError: null,
      updatedAt: new Date().toISOString(),
    },
  });
  enqueueAuthorStyleJob(async () => {
    const result = await rebuildAuthorStyleVector(styleId);
    if (!result.success)
      console.warn(`[author-styles] rebuild failed styleId=${styleId} error=${result.error ?? "unknown"}`);
  });
}

/**
 * 聚合当前模型下可参与匹配的作者风格候选。
 */
async function listAuthorStyleCandidates(modelId: string): Promise<AuthorStyleCandidate[]> {
  const vectors = await findMany<DatabaseAuthorStyleVector>(COLLECTIONS.authorStyleVectors, {
    modelId,
    status: "ready",
  }, { limit: 5000 });
  const styleIds = vectors.map(vector => vector.authorStyleId).filter(isObjectId).map(objectId);
  const styles = await findMany<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, {
    _id: { $in: styleIds },
    vectorStatus: "ready",
  });
  const styleMap = new Map(styles.map(style => [style._id?.toString(), style as WithId<DatabaseAuthorStyle>]));
  return vectors.flatMap((vector) => {
    const style = styleMap.get(vector.authorStyleId);
    return style ? [{ style, vector: vector as WithId<DatabaseAuthorStyleVector> }] : [];
  });
}

/**
 * 基于双方已抽取的风格特征生成解释理由。
 */
function buildMatchReasons(articleProfile: AuthorStyleFeatureProfile, authorProfile: AuthorStyleFeatureProfile): string[] {
  const reasons = [
    `故事内容接近：${authorProfile.storyContent || authorProfile.summary}`,
    `核心表达相近：${authorProfile.coreExpression || authorProfile.summary}`,
    `体裁类型相近：${authorProfile.genreType || "未标注"}`,
    `表达节奏相似：${authorProfile.expressionRhythm}`,
    `语言习惯接近：${authorProfile.languageHabits.slice(0, 2).join("、") || authorProfile.summary}`,
  ];
  const sharedKeywords = articleProfile.keywords.filter(keyword => authorProfile.keywords.includes(keyword)).slice(0, 3);
  if (sharedKeywords.length > 0)
    reasons.unshift(`共同关键词：${sharedKeywords.join("、")}`);
  return reasons.map(reason => reason.slice(0, 120)).filter(Boolean).slice(0, 3);
}

/**
 * 分析当前作品的风格特征。
 */
export async function extractArticleStyleProfile(articleText: string): Promise<AuthorStyleFeatureProfile | null> {
  if (!articleText.trim())
    return null;
  const syntheticInput: AuthorStyleLibrarySaveInput = {
    authorName: "待分析文本",
    representativeTexts: [articleText.slice(0, MAX_STYLE_TEXT_CHARS)],
  };
  return extractStyleFeatures(syntheticInput);
}

/**
 * 分析用户文本并从作者风格库中检索最相似作者。
 */
export async function matchAuthorStyleForArticle(articleText: string): Promise<ArticleStyleMatchResult> {
  const articleProfile = await extractArticleStyleProfile(articleText);
  if (!articleProfile)
    return { articleProfile: null, matches: [] };

  const authorStyleSetting = await getSiteSettingValue("ai.authorStyle");
  if (!authorStyleSetting.enabled)
    return { articleProfile, matches: [] };

  await getEffectiveVectorSearchSetting();
  const model = getRuntimeEmbeddingModel();
  if (!model)
    return { articleProfile, matches: [] };

  const queryVector = await createEmbedding(model, buildFeatureEmbeddingText("待分析文本", articleProfile));
  const candidates = await listAuthorStyleCandidates(model.id);
  const matches = candidates
    .map(({ style, vector }) => {
      const similarity = cosineSimilarity(queryVector, vector.vector);
      const authorProfile = style.featureProfile;
      return {
        authorId: style._id.toString(),
        name: style.authorName,
        styleLabel: authorProfile?.styleLabel || style.styleIntro || "相近风格",
        description: authorProfile
          ? `相似度达到 ${Math.round(similarity * 100)}%。${authorProfile.summary}`
          : `相似度达到 ${Math.round(similarity * 100)}%。${style.styleIntro}`,
        confidence: Math.round(similarity * 100),
        similarity,
        source: "library" as const,
        reasons: authorProfile ? buildMatchReasons(articleProfile, authorProfile) : [style.styleIntro || "样本文案在整体表达方式上接近。"],
      };
    })
    .filter(result => result.similarity >= authorStyleSetting.similarityThreshold)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, authorStyleSetting.topK);
  return { articleProfile, matches };
}

/**
 * 作者风格库管理模块。
 */
export const authorStylesModule = new Elysia()
  .get("/api/v2/admin/author-styles", async ({ request }) => {
    await requireAdmin(request.headers);
    const items = await findMany<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, {}, { sort: { updatedAt: -1 }, limit: 200 });
    const total = await (await collection<DatabaseAuthorStyle>(COLLECTIONS.authorStyles)).countDocuments();
    return ok({ items: items.map(item => serializeAuthorStyle(item as WithId<DatabaseAuthorStyle>)), total });
  }, { detail: { tags: ["REST: Admin"], summary: "获取作者风格库" } })
  .post("/api/v2/admin/author-styles", async ({ request, body }) => {
    await requireAdmin(request.headers);
    const input = normalizeAuthorStyleInput(body as AuthorStyleLibrarySaveInput);
    if (!input.authorName)
      return { success: false, message: "作者名称不能为空" };
    if (input.representativeTexts.length === 0)
      return { success: false, message: "请至少录入一段代表性文案" };

    const now = new Date().toISOString();
    const document: DatabaseAuthorStyle = {
      authorName: input.authorName,
      bio: input.bio ?? "",
      representativeWorks: input.representativeWorks ?? [],
      representativeTexts: input.representativeTexts,
      styleIntro: input.styleIntro ?? "",
      featureProfile: null,
      vectorStatus: "pending",
      vectorModelId: null,
      vectorUpdatedAt: null,
      vectorError: null,
      createdAt: now,
      updatedAt: now,
    };
    const id = new ObjectId();
    await insertOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: id, ...document });
    await enqueueAuthorStyleVectorRebuild(id.toString());
    const saved = await findOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: id });
    return ok(serializeAuthorStyle(saved as WithId<DatabaseAuthorStyle>), "作者风格已保存，风格特征和向量将在后台生成");
  }, {
    body: t.Object({
      authorName: t.String({ minLength: 1, maxLength: 80 }),
      bio: t.Optional(t.String({ maxLength: 1000 })),
      representativeWorks: t.Optional(t.Array(t.String({ maxLength: MAX_REPRESENTATIVE_WORK_CHARS }), { maxItems: MAX_REPRESENTATIVE_WORKS })),
      representativeTexts: t.Array(t.String({ minLength: 1, maxLength: MAX_STYLE_TEXT_CHARS }), { minItems: 1, maxItems: MAX_REPRESENTATIVE_TEXTS }),
      styleIntro: t.Optional(t.String({ maxLength: 2000 })),
    }),
    detail: { tags: ["REST: Admin"], summary: "创建作者风格" },
  })
  .patch("/api/v2/admin/author-styles/:id", async ({ request, params, body }) => {
    await requireAdmin(request.headers);
    if (!isObjectId(params.id))
      return { success: false, message: "作者记录不存在" };

    const input = normalizeAuthorStyleInput(body as AuthorStyleLibrarySaveInput);
    if (!input.authorName)
      return { success: false, message: "作者名称不能为空" };
    if (input.representativeTexts.length === 0)
      return { success: false, message: "请至少录入一段代表性文案" };

    const now = new Date().toISOString();
    await updateOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(params.id) }, {
      $set: {
        authorName: input.authorName,
        bio: input.bio ?? "",
        representativeWorks: input.representativeWorks ?? [],
        representativeTexts: input.representativeTexts,
        styleIntro: input.styleIntro ?? "",
        vectorStatus: "pending",
        vectorError: null,
        updatedAt: now,
      },
    });
    await enqueueAuthorStyleVectorRebuild(params.id);
    const saved = await findOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(params.id) });
    return ok(serializeAuthorStyle(saved as WithId<DatabaseAuthorStyle>), "作者风格已更新，风格特征和向量将在后台生成");
  }, {
    body: t.Object({
      authorName: t.String({ minLength: 1, maxLength: 80 }),
      bio: t.Optional(t.String({ maxLength: 1000 })),
      representativeWorks: t.Optional(t.Array(t.String({ maxLength: MAX_REPRESENTATIVE_WORK_CHARS }), { maxItems: MAX_REPRESENTATIVE_WORKS })),
      representativeTexts: t.Array(t.String({ minLength: 1, maxLength: MAX_STYLE_TEXT_CHARS }), { minItems: 1, maxItems: MAX_REPRESENTATIVE_TEXTS }),
      styleIntro: t.Optional(t.String({ maxLength: 2000 })),
    }),
    detail: { tags: ["REST: Admin"], summary: "更新作者风格" },
  })
  .delete("/api/v2/admin/author-styles/:id", async ({ request, params }) => {
    await requireAdmin(request.headers);
    if (!isObjectId(params.id))
      return { success: false, message: "作者记录不存在" };
    await deleteOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(params.id) });
    await (await collection<DatabaseAuthorStyleVector>(COLLECTIONS.authorStyleVectors)).deleteMany({ authorStyleId: params.id });
    return ok(null, "作者风格已删除");
  }, { detail: { tags: ["REST: Admin"], summary: "删除作者风格" } })
  .post("/api/v2/admin/author-styles/:id/rebuild", async ({ request, params }) => {
    await requireAdmin(request.headers);
    if (!isObjectId(params.id))
      return { success: false, message: "作者记录不存在" };
    await enqueueAuthorStyleVectorRebuild(params.id);
    const saved = await findOne<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, { _id: objectId(params.id) });
    return ok(serializeAuthorStyle(saved as WithId<DatabaseAuthorStyle>), "作者风格向量已加入后台重建队列");
  }, { detail: { tags: ["REST: Admin"], summary: "重建单个作者风格向量" } })
  .post("/api/v2/admin/author-styles/rebuild", async ({ request, body }) => {
    await requireAdmin(request.headers);
    const limit = Math.min(Math.max(Number((body as { limit?: number }).limit ?? MAX_REBUILD_BATCH_SIZE), 1), MAX_REBUILD_BATCH_SIZE);
    const styles = await findMany<DatabaseAuthorStyle>(COLLECTIONS.authorStyles, {}, { sort: { updatedAt: -1 }, limit });
    for (const style of styles) {
      await enqueueAuthorStyleVectorRebuild(String(style._id ?? ""));
    }
    return ok({ total: styles.length, queued: styles.length }, "作者风格库向量已加入后台重建队列");
  }, {
    body: t.Object({
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: MAX_REBUILD_BATCH_SIZE })),
    }),
    detail: { tags: ["REST: Admin"], summary: "批量重建作者风格向量" },
  });

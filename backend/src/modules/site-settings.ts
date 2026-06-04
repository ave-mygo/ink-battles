import type {
  AiGenerationSetting,
  AnalysisRuntimeSetting,
  AnalysisScoringPolicySetting,
  FriendLink,
  GradingModelAdminConfig,
  HonoraryWriterUserSummary,
  PublicConfigResponse,
  PublicUploadLimits,
  SiteSettingHistoryItem,
  SiteSettingKey,
  SiteSettingMeta,
  SiteSettingValueMap,
} from "@ink-battles/shared/types/common";
import type { Document, WithId } from "mongodb";
import { createHash } from "node:crypto";
import { Elysia, t } from "elysia";
import { getConfig, isConfiguredAdminUid } from "../config";
import { COLLECTIONS, findMany, findOne, findOneAndUpdate, insertOne } from "../db/mongo";
import { requireAdmin } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { ok, serializeDate } from "../utils/response";

interface SiteSettingDocument extends Document {
  key: SiteSettingKey;
  category: SiteSettingMeta["category"];
  value: SiteSettingValueMap[SiteSettingKey];
  updatedAt: Date;
  updatedByUid: number;
  updatedByLabel: string;
}

interface SiteSettingChangeDocument extends Document {
  key: SiteSettingKey;
  adminUid: number;
  adminLabel: string;
  before: SiteSettingValueMap[SiteSettingKey] | null;
  after: SiteSettingValueMap[SiteSettingKey];
  ipHash?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export type EffectiveGradingModelConfig = ReturnType<typeof getConfig>["grading_models"][number];

const SETTING_DEFINITIONS: Array<Pick<SiteSettingMeta, "key" | "label" | "description" | "category">> = [
  {
    key: "site.notice",
    label: "首页公告",
    description: "首页顶部公告栏内容，适合临时通知、活动提醒和维护公告。",
    category: "content",
  },
  {
    key: "site.friends",
    label: "友情链接",
    description: "友情链接列表，属于内容型配置，适合由后台可视化维护。",
    category: "content",
  },
  {
    key: "registration.policy",
    label: "注册策略",
    description: "是否要求邀请码等注册开关，修改后立即影响注册流程。",
    category: "registration",
  },
  {
    key: "content.uploadLimits",
    label: "上传与输入限制",
    description: "前端输入和上传提示使用的字数限制，后端硬限制仍由分析基础配置兜底。",
    category: "limits",
  },
  {
    key: "analysis.runtime",
    label: "文章分析运行参数",
    description: "分析提交、队列、输出、游客结果保留和流式处理限制。",
    category: "limits",
  },
  {
    key: "analysis.scoringPolicy",
    label: "评分计算策略",
    description: "最终分数计算中的补偿阈值和权重策略。",
    category: "limits",
  },
  {
    key: "ai.generation",
    label: "AI 生成参数",
    description: "模型生成温度、seed 和 JSON mode 等不含凭证的调用策略。",
    category: "limits",
  },
  {
    key: "ai.gradingModels",
    label: "评分模型运营信息",
    description: "模型展示名、启用状态、会员标记和公开说明；密钥与地址仍来自启动配置。",
    category: "content",
  },
  {
    key: "content.honoraryWriters",
    label: "荣誉作家管理",
    description: "授予指定用户亮点句子审核、通过和驳回权限，不包含站点配置等系统级管理能力。",
    category: "content",
  },
];

let cachedSettings: Map<SiteSettingKey, SiteSettingDocument> | null = null;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * 返回 config.toml 中可作为数据库站点配置初始值的安全默认值。
 */
function getDefaultSettingValue<Key extends SiteSettingKey>(key: Key): SiteSettingValueMap[Key] {
  const config = getConfig();
  const defaults: SiteSettingValueMap = {
    "site.notice": config.app.notice,
    "site.friends": config.friends ?? [],
    "registration.policy": config.registration,
    "content.uploadLimits": {
      guestPerRequestChars: 60000,
      loggedPerRequestChars: 60000,
      guestDailyChars: 100000,
    },
    "analysis.runtime": {
      ...config.analysis,
      task_timeout_ms: 7 * 60 * 1000,
      stream_max_chunks: 20000,
      validation_max_text_chars: 200000,
      excellent_sentences_max_count: 2,
    },
    "analysis.scoringPolicy": {
      enable_low_score_compensation: true,
      compensation_score_floor: 3,
      compensation_min_count_above_3_5: 6,
      compensation_min_count_above_4_0: 3,
    },
    "ai.generation": {
      default_temperature: 0.3,
      gpt5_nano_temperature: 1,
      enable_seed: true,
      enable_json_mode_when_supported: true,
    },
    "ai.gradingModels": config.grading_models.map(model => ({
      id: model.id ?? model.model,
      name: model.name,
      model: model.model,
      description: model.description,
      enabled: model.enabled,
      premium: model.premium === true,
      features: model.features ?? [],
      advantages: model.advantages,
      usageScenario: model.usageScenario,
      warning: model.warning,
      supports_json_mode: model.supports_json_mode,
    })),
    "content.honoraryWriters": {
      uids: [],
    },
  };
  return defaults[key] as SiteSettingValueMap[Key];
}

/**
 * 校验并规整站点配置值，避免任意 JSON 污染公共配置结构。
 */
function normalizeSettingValue<Key extends SiteSettingKey>(key: Key, value: unknown): SiteSettingValueMap[Key] {
  if (key === "site.notice") {
    const record = value as Partial<SiteSettingValueMap["site.notice"]>;
    return {
      enabled: record.enabled === true,
      content: String(record.content ?? "").slice(0, 500),
      link: String(record.link ?? "").slice(0, 500),
    } as SiteSettingValueMap[Key];
  }

  if (key === "site.friends") {
    const list = Array.isArray(value) ? value : [];
    return list.slice(0, 100).map((item) => {
      const record = item as Partial<FriendLink>;
      return {
        title: String(record.title ?? "").slice(0, 80),
        description: String(record.description ?? "").slice(0, 200),
        url: String(record.url ?? "").slice(0, 500),
      };
    }).filter(item => item.title && item.url) as SiteSettingValueMap[Key];
  }

  if (key === "registration.policy") {
    const record = value as Partial<SiteSettingValueMap["registration.policy"]>;
    return {
      invite_code_required: record.invite_code_required === true,
    } as SiteSettingValueMap[Key];
  }

  const numericValue = (input: unknown, fallback: number) => {
    const nextValue = Number(input);
    return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : fallback;
  };

  if (key === "content.uploadLimits") {
    const record = value as Partial<PublicUploadLimits>;
    return {
      guestPerRequestChars: numericValue(record.guestPerRequestChars, 60000),
      loggedPerRequestChars: numericValue(record.loggedPerRequestChars, 60000),
      guestDailyChars: numericValue(record.guestDailyChars, 100000),
    } as SiteSettingValueMap[Key];
  }

  if (key === "analysis.runtime") {
    const fallback = getDefaultSettingValue("analysis.runtime");
    const record = value as Partial<AnalysisRuntimeSetting>;
    return {
      max_article_chars: numericValue(record.max_article_chars, fallback.max_article_chars),
      max_output_chars: numericValue(record.max_output_chars, fallback.max_output_chars),
      max_concurrent_tasks: numericValue(record.max_concurrent_tasks, fallback.max_concurrent_tasks),
      max_queued_tasks: numericValue(record.max_queued_tasks, fallback.max_queued_tasks),
      max_sponsor_queued_tasks: numericValue(record.max_sponsor_queued_tasks, fallback.max_sponsor_queued_tasks),
      max_active_tasks_per_user: numericValue(record.max_active_tasks_per_user, fallback.max_active_tasks_per_user),
      max_mode_chars: numericValue(record.max_mode_chars, fallback.max_mode_chars),
      max_fingerprint_chars: numericValue(record.max_fingerprint_chars, fallback.max_fingerprint_chars),
      guest_result_ttl_minutes: numericValue(record.guest_result_ttl_minutes, fallback.guest_result_ttl_minutes),
      task_timeout_ms: numericValue(record.task_timeout_ms, fallback.task_timeout_ms),
      stream_max_chunks: numericValue(record.stream_max_chunks, fallback.stream_max_chunks),
      validation_max_text_chars: numericValue(record.validation_max_text_chars, fallback.validation_max_text_chars),
      excellent_sentences_max_count: numericValue(record.excellent_sentences_max_count, fallback.excellent_sentences_max_count),
    } as SiteSettingValueMap[Key];
  }

  if (key === "analysis.scoringPolicy") {
    const fallback = getDefaultSettingValue("analysis.scoringPolicy");
    const record = value as Partial<AnalysisScoringPolicySetting>;
    return {
      enable_low_score_compensation: record.enable_low_score_compensation !== false,
      compensation_score_floor: Number(record.compensation_score_floor) || fallback.compensation_score_floor,
      compensation_min_count_above_3_5: numericValue(record.compensation_min_count_above_3_5, fallback.compensation_min_count_above_3_5),
      compensation_min_count_above_4_0: numericValue(record.compensation_min_count_above_4_0, fallback.compensation_min_count_above_4_0),
    } as SiteSettingValueMap[Key];
  }

  if (key === "ai.generation") {
    const fallback = getDefaultSettingValue("ai.generation");
    const record = value as Partial<AiGenerationSetting>;
    return {
      default_temperature: Number.isFinite(Number(record.default_temperature)) ? Number(record.default_temperature) : fallback.default_temperature,
      gpt5_nano_temperature: Number.isFinite(Number(record.gpt5_nano_temperature)) ? Number(record.gpt5_nano_temperature) : fallback.gpt5_nano_temperature,
      enable_seed: record.enable_seed !== false,
      enable_json_mode_when_supported: record.enable_json_mode_when_supported !== false,
    } as SiteSettingValueMap[Key];
  }

  if (key === "content.honoraryWriters") {
    const record = value as Partial<SiteSettingValueMap["content.honoraryWriters"]>;
    const uids = Array.isArray(record.uids) ? record.uids : [];
    return {
      uids: Array.from(new Set(uids.map(uid => Number(uid)).filter(uid => Number.isInteger(uid) && uid > 0))).slice(0, 200),
    } as SiteSettingValueMap[Key];
  }

  const list = Array.isArray(value) ? value : [];
  return list.map((item) => {
    const record = item as Partial<GradingModelAdminConfig>;
    return {
      id: String(record.id ?? record.model ?? "").slice(0, 128),
      name: String(record.name ?? record.model ?? "").slice(0, 80),
      model: String(record.model ?? record.id ?? "").slice(0, 128),
      description: String(record.description ?? "").slice(0, 500),
      enabled: record.enabled !== false,
      premium: record.premium === true,
      features: Array.isArray(record.features) ? record.features.map(feature => String(feature).slice(0, 80)).slice(0, 20) : [],
      advantages: Array.isArray(record.advantages) ? record.advantages.map(advantage => String(advantage).slice(0, 200)).slice(0, 20) : undefined,
      usageScenario: record.usageScenario ? String(record.usageScenario).slice(0, 500) : undefined,
      warning: record.warning ? String(record.warning).slice(0, 500) : undefined,
      supports_json_mode: record.supports_json_mode,
    };
  }).filter(item => item.id && item.model) as SiteSettingValueMap[Key];
}

/**
 * 读取全部数据库站点配置，并在内存中缓存到下次配置变更。
 */
async function getSettingsMap() {
  if (cachedSettings)
    return cachedSettings;

  const settings = await findMany<SiteSettingDocument>(COLLECTIONS.siteSettings, {});
  cachedSettings = new Map(settings.map(setting => [setting.key, setting]));
  return cachedSettings;
}

/**
 * 清理站点配置缓存，让后续读取立即看到新值。
 */
export function invalidateSiteSettingsCache() {
  cachedSettings = null;
}

/**
 * 获取指定站点配置值，优先使用数据库值，否则回退到 config.toml/default。
 */
export async function getSiteSettingValue<Key extends SiteSettingKey>(key: Key): Promise<SiteSettingValueMap[Key]> {
  const settings = await getSettingsMap();
  const setting = settings.get(key);
  return (setting?.value ?? getDefaultSettingValue(key)) as SiteSettingValueMap[Key];
}

/**
 * 同步读取已加载的配置快照，用于队列等同步路径。
 */
export function getCachedSiteSettingValue<Key extends SiteSettingKey>(key: Key): SiteSettingValueMap[Key] {
  return (cachedSettings?.get(key)?.value ?? getDefaultSettingValue(key)) as SiteSettingValueMap[Key];
}

/**
 * 合并启动配置中的模型凭证和数据库中的运营配置。
 */
function mergeGradingModels() {
  const modelSettings = getCachedSiteSettingValue("ai.gradingModels");
  return getConfig().grading_models.map((baseModel) => {
    const baseId = baseModel.id ?? baseModel.model;
    const dynamicModel = modelSettings.find(item => item.id === baseId || item.model === baseModel.model);
    return {
      ...baseModel,
      id: dynamicModel?.id ?? baseId,
      name: dynamicModel?.name ?? baseModel.name,
      description: dynamicModel?.description ?? baseModel.description,
      enabled: dynamicModel?.enabled ?? baseModel.enabled,
      premium: dynamicModel?.premium ?? baseModel.premium,
      features: dynamicModel?.features ?? baseModel.features,
      advantages: dynamicModel?.advantages ?? baseModel.advantages,
      usageScenario: dynamicModel?.usageScenario ?? baseModel.usageScenario,
      warning: dynamicModel?.warning ?? baseModel.warning,
      supports_json_mode: dynamicModel?.supports_json_mode ?? baseModel.supports_json_mode,
    };
  });
}

/**
 * 根据 ID 查询有效评分模型，凭证仍来自启动配置。
 */
export function getCachedEffectiveGradingModelById(id: string) {
  return mergeGradingModels().find(model => (model.id ?? model.model) === id && model.enabled) ?? null;
}

/**
 * 获取当前公开可用评分模型。
 */
export function getCachedPublicGradingModels() {
  return mergeGradingModels().filter(model => model.enabled);
}

/**
 * 启动时初始化站点配置集合和默认数据。
 */
export async function ensureSiteSettingsInitialized() {
  const now = new Date();
  for (const definition of SETTING_DEFINITIONS) {
    const existing = await findOne<SiteSettingDocument>(COLLECTIONS.siteSettings, { key: definition.key });
    if (existing)
      continue;
    const value = getDefaultSettingValue(definition.key);
    await insertOne<SiteSettingDocument>(COLLECTIONS.siteSettings, {
      key: definition.key,
      category: definition.category,
      value,
      updatedAt: now,
      updatedByUid: 0,
      updatedByLabel: "system",
      createdAt: now,
    });
    await insertOne<SiteSettingChangeDocument>(COLLECTIONS.siteSettingChanges, {
      key: definition.key,
      adminUid: 0,
      adminLabel: "system",
      before: null,
      after: value,
      ipHash: null,
      userAgent: "startup-seed",
      createdAt: now,
    });
  }
  cachedSettings = null;
  await getSettingsMap();
}

/**
 * 获取合并后的公开配置，供前端 SSR 和客户端读取。
 */
export async function getMergedPublicConfig(): Promise<PublicConfigResponse> {
  const baseConfig = getConfig();
  const [notice, friends, registration, uploadLimits, gradingModels] = await Promise.all([
    getSiteSettingValue("site.notice"),
    getSiteSettingValue("site.friends"),
    getSiteSettingValue("registration.policy"),
    getSiteSettingValue("content.uploadLimits"),
    getSiteSettingValue("ai.gradingModels"),
  ]);

  return {
    app: {
      app_name: baseConfig.app.app_name,
      notice,
    },
    friends,
    registration,
    uploadLimits,
    gradingModels: gradingModels.filter(model => model.enabled).map(model => ({
      id: model.id ?? model.model,
      name: model.name,
      description: model.description,
      premium: model.premium === true,
      features: model.features,
      advantages: model.advantages,
      usageScenario: model.usageScenario,
      warning: model.warning,
    })),
  };
}

/**
 * 获取后台展示所需的当前配置列表。
 */
async function listSiteSettings(): Promise<SiteSettingMeta[]> {
  const settings = await getSettingsMap();
  return SETTING_DEFINITIONS.map((definition) => {
    const setting = settings.get(definition.key);
    return {
      ...definition,
      value: setting?.value ?? getDefaultSettingValue(definition.key),
      source: setting ? "database" : "config",
      updatedAt: serializeDate(setting?.updatedAt),
      updatedByUid: setting?.updatedByUid ?? null,
      updatedByLabel: setting?.updatedByLabel ?? null,
    };
  });
}

/**
 * 序列化站点配置历史记录。
 */
function serializeHistoryItem(item: WithId<SiteSettingChangeDocument>): SiteSettingHistoryItem {
  return {
    id: item._id.toString(),
    key: item.key,
    adminUid: item.adminUid,
    adminLabel: item.adminLabel,
    before: item.before,
    after: item.after,
    ipHash: item.ipHash ?? null,
    userAgent: item.userAgent ?? null,
    createdAt: serializeDate(item.createdAt) ?? new Date().toISOString(),
  };
}

/**
 * 序列化后台荣誉作家候选用户。
 */
function serializeAdminUser(item: Record<string, unknown>, honoraryWriterUids: Set<number>): HonoraryWriterUserSummary {
  const uid = Number(item.uid);
  return {
    uid,
    nickname: typeof item.nickname === "string" ? item.nickname : null,
    email: typeof item.email === "string" ? item.email : null,
    avatar: typeof item.avatar === "string" ? item.avatar : null,
    isAdmin: isConfiguredAdminUid(uid),
    isHonoraryWriter: honoraryWriterUids.has(uid),
    createdAt: serializeDate(item.createdAt),
  };
}

export const siteSettingsModule = new Elysia()
  .get("/api/v2/admin/site-settings", async ({ request }) => {
    await requireAdmin(request.headers);
    return ok(await listSiteSettings());
  }, { detail: { tags: ["REST: Admin"] } })
  .get("/api/v2/admin/site-settings/history", async ({ request, query }) => {
    await requireAdmin(request.headers);
    const key = SETTING_DEFINITIONS.some(definition => definition.key === query.key) ? query.key as SiteSettingKey : undefined;
    const history = await findMany<SiteSettingChangeDocument>(
      COLLECTIONS.siteSettingChanges,
      key ? { key } : {},
      { sort: { createdAt: -1 }, limit: 50 },
    );
    return ok(history.map(item => serializeHistoryItem(item)));
  }, {
    query: t.Object({ key: t.Optional(t.String()) }),
    detail: { tags: ["REST: Admin"] },
  })
  .get("/api/v2/admin/users", async ({ request, query }) => {
    await requireAdmin(request.headers);
    const keyword = String(query.q ?? "").trim();
    const limit = Math.min(Number(query.limit ?? 200) || 200, 500);
    const userFilter = keyword
      ? {
          $or: [
            { nickname: { $regex: keyword, $options: "i" } },
            { email: { $regex: keyword, $options: "i" } },
            { uid: Number(keyword) || -1 },
          ],
        }
      : {};
    const [users, honoraryWriters] = await Promise.all([
      findMany<Record<string, unknown>>(COLLECTIONS.users, userFilter, { sort: { uid: -1 }, limit }),
      getSiteSettingValue("content.honoraryWriters"),
    ]);
    const honoraryWriterUids = new Set(honoraryWriters.uids);
    return ok(users.map(item => serializeAdminUser(item, honoraryWriterUids)));
  }, {
    query: t.Object({
      q: t.Optional(t.String()),
      limit: t.Optional(t.Numeric()),
    }),
    detail: { tags: ["REST: Admin"] },
  })
  .put("/api/v2/admin/site-settings/:key", async ({ request, params, body }) => {
    const admin = await requireAdmin(request.headers);
    const key = params.key as SiteSettingKey;
    const definition = SETTING_DEFINITIONS.find(item => item.key === key);
    if (!definition)
      throw new Error("INVALID_SITE_SETTING_KEY");

    const now = new Date();
    const beforeDocument = await findOne<SiteSettingDocument>(COLLECTIONS.siteSettings, { key });
    const beforeValue = beforeDocument?.value ?? getDefaultSettingValue(key);
    const afterValue = normalizeSettingValue(key, (body as { value?: unknown }).value);
    const adminLabel = admin.nickname || admin.email || `UID ${admin.uid}`;
    const ip = getRequestIp(request);
    const userAgent = getRequestUserAgent(request);
    const ipHash = ip ? sha256(ip) : null;

    await findOneAndUpdate<SiteSettingDocument>(COLLECTIONS.siteSettings, { key }, {
      $set: {
        key,
        category: definition.category,
        value: afterValue,
        updatedAt: now,
        updatedByUid: admin.uid,
        updatedByLabel: adminLabel,
      },
      $setOnInsert: {
        createdAt: now,
      },
    }, { upsert: true });

    await insertOne<SiteSettingChangeDocument>(COLLECTIONS.siteSettingChanges, {
      key,
      adminUid: admin.uid,
      adminLabel,
      before: beforeValue,
      after: afterValue,
      ipHash,
      userAgent,
      createdAt: now,
    });

    writeAuditLog({
      event: "site_setting_updated",
      uid: admin.uid,
      ip,
      userAgent,
      metadata: {
        key,
        before: beforeValue,
        after: afterValue,
      },
    });

    invalidateSiteSettingsCache();
    return ok(await listSiteSettings(), "配置已更新");
  }, {
    body: t.Object({ value: t.Unknown() }),
    detail: { tags: ["REST: Admin"] },
  });

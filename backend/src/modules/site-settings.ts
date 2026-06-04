import type {
  HonoraryWriterUserSummary,
  PublicConfigResponse,
  SiteSettingHistoryItem,
  SiteSettingKey,
  SiteSettingMeta,
  SiteSettingValueMap,
} from "@ink-battles/shared/types/common";
import type { WithId } from "mongodb";
import { createHash } from "node:crypto";
import { Elysia, t } from "elysia";
import { getConfig, isConfiguredAdminUid } from "../config";
import { COLLECTIONS, findMany, findOne, findOneAndUpdate, insertOne } from "../db/mongo";
import { requireAdmin } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { ok, serializeDate } from "../utils/response";
import {
  getDefaultSettingValue,
  normalizeSettingValue,
  SETTING_DEFINITIONS,
  type EffectiveGradingModelConfig,
  type SiteSettingChangeDocument,
  type SiteSettingDocument,
} from "./site-settings/settings";

export type { EffectiveGradingModelConfig };

let cachedSettings: Map<SiteSettingKey, SiteSettingDocument> | null = null;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");


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

import crypto from "node:crypto";
import { getServerConfig } from "../config";
import { COLLECTIONS, ensureCollectionExists, findMany, findOneAndUpdate, insertOne } from "../db/mongo";
import { hasDonatedAccount } from "../modules/billing";
import { getCachedEffectiveGradingModelById } from "../modules/site-settings";
import { getRequestIp } from "../utils/request";
import { normalizeEmail } from "../utils/validators";
import { getCurrentUser } from "./auth";

interface RateLimitRecord {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

interface FreeAnalysisTokenSlot {
  key: string;
  lastUsedAt: Date;
  expiresAt: Date;
  updatedAt: Date;
}

interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
  /** 超限后抛出的错误哨兵值，缺省为 RATE_LIMITED，由 errors.ts 映射为 HTTP 响应 */
  error?: string;
  key: (request: Request, body: Record<string, unknown>) => Promise<string | null> | string | null;
}

const ONE_MINUTE_MS = 60 * 1000;
const FREE_ANALYSIS_TOKEN_CAPACITY = 3;
const SPONSOR_FREE_ANALYSIS_REFILL_MS = 5 * ONE_MINUTE_MS;
const STANDARD_FREE_ANALYSIS_REFILL_MS = 30 * ONE_MINUTE_MS;
const serverConfig = getServerConfig();

/**
 * 对字符串进行 SHA-256 哈希并截取前 32 位十六进制字符
 * @param value - 待哈希的字符串
 * @returns 哈希后的字符串（32 位十六进制字符）
 */
const hashPart = (value: string) => crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);

/**
 * 安全地读取请求的 JSON 请求体
 * @param request - 请求对象
 * @returns 解析后的 JSON 对象，解析失败时返回空对象
 * @throws 如果请求体过大则抛出 PAYLOAD_TOO_LARGE 错误
 */
async function readJsonBody(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json"))
      return {};
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > serverConfig.max_json_body_bytes)
      throw new Error("PAYLOAD_TOO_LARGE");
    const body = await request.clone().json();
    return typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/**
 * 标准化请求的 IP 地址
 * @param request - 请求对象
 * @returns 标准化后的 IP 地址，获取失败时返回 "unknown"
 */
const normalizeIp = (request: Request) => getRequestIp(request) || "unknown";

/**
 * 检查请求路径是否匹配指定路径
 * @param request - 请求对象
 * @param path - 待匹配的路径
 * @returns 如果路径匹配则返回 true，否则返回 false
 */
function pathMatches(request: Request, path: string) {
  return new URL(request.url).pathname === path;
}

/**
 * 生成限流桶键，用于按时间窗口对请求进行分组
 * @param ruleName - 规则名称
 * @param rawKey - 原始键值（通常是 IP 或用户标识）
 * @param windowMs - 时间窗口长度（毫秒）
 * @returns 组合后的桶键字符串
 */
function createBucketKey(ruleName: string, rawKey: string, windowMs: number) {
  const bucket = Math.floor(Date.now() / windowMs);
  return `${ruleName}:${bucket}:${hashPart(rawKey)}`;
}

/**
 * 检查错误是否为 MongoDB 命名空间不存在错误
 * @param error - 错误对象
 * @returns 如果是命名空间不存在错误则返回 true，否则返回 false
 */
function isNamespaceNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 26;
}

/**
 * 原子性地增加限流计数器并返回最新记录
 * @param key - 限流键
 * @param windowStart - 时间窗口开始时间
 * @param windowMs - 时间窗口长度（毫秒）
 * @param now - 当前时间
 * @returns 更新后的限流记录
 */
async function incrementRateLimit(key: string, windowStart: Date, windowMs: number, now: Date) {
  return findOneAndUpdate<RateLimitRecord>(COLLECTIONS.rateLimits, { key }, {
    $inc: { count: 1 },
    $setOnInsert: {
      key,
      windowStart,
      expiresAt: new Date(windowStart.getTime() + windowMs + ONE_MINUTE_MS),
    },
    $set: { updatedAt: now },
  }, { upsert: true, returnDocument: "after" });
}

/**
 * 判断错误是否为 MongoDB 重复键错误
 * @param error - 错误对象
 * @returns 如果是重复键错误则返回 true，否则返回 false
 */
function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

/**
 * 创建免费分析令牌槽位键
 * @param identity - 用户或游客身份键
 * @param slot - 令牌槽位编号
 * @returns 脱敏后的令牌槽位键
 */
function createFreeAnalysisTokenKey(identity: string, slot: number) {
  return `free_analysis_token:${hashPart(identity)}:${slot}`;
}

/**
 * 初始化免费分析令牌槽位。重复初始化由唯一键保证幂等。
 * @param identity - 用户或游客身份键
 * @param now - 当前时间
 * @param refillMs - 令牌恢复间隔
 */
async function initializeFreeAnalysisTokenSlots(identity: string, now: Date, refillMs: number) {
  const expiresAt = new Date(now.getTime() + refillMs * FREE_ANALYSIS_TOKEN_CAPACITY);
  const initialLastUsedAt = new Date(now.getTime() - refillMs);
  for (let slot = 0; slot < FREE_ANALYSIS_TOKEN_CAPACITY; slot++) {
    try {
      await insertOne<FreeAnalysisTokenSlot>(COLLECTIONS.rateLimits, {
        key: createFreeAnalysisTokenKey(identity, slot),
        lastUsedAt: initialLastUsedAt,
        expiresAt,
        updatedAt: now,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error))
        throw error;
    }
  }
}

/**
 * 原子领取一个已恢复的免费分析令牌槽位。
 * @param identity - 用户或游客身份键
 * @param refillMs - 令牌恢复间隔
 * @throws ANALYSIS_QUOTA_EXCEEDED 如果所有令牌均未恢复
 */
async function consumeFreeAnalysisToken(identity: string, refillMs: number) {
  const now = new Date();
  try {
    await initializeFreeAnalysisTokenSlots(identity, now, refillMs);
  } catch (error) {
    if (!isNamespaceNotFound(error))
      throw error;
    await ensureCollectionExists(COLLECTIONS.rateLimits);
    await initializeFreeAnalysisTokenSlots(identity, now, refillMs);
  }

  const recoveredBefore = new Date(now.getTime() - refillMs);
  for (let slot = 0; slot < FREE_ANALYSIS_TOKEN_CAPACITY; slot++) {
    const claimed = await findOneAndUpdate<FreeAnalysisTokenSlot>(COLLECTIONS.rateLimits, {
      key: createFreeAnalysisTokenKey(identity, slot),
      lastUsedAt: { $lte: recoveredBefore },
    }, {
      $set: {
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + refillMs * FREE_ANALYSIS_TOKEN_CAPACITY),
        updatedAt: now,
      },
    });
    if (claimed)
      return;
  }

  throw new Error("ANALYSIS_QUOTA_EXCEEDED");
}

/**
 * 执行单条限流规则，计数并在超出限制时抛出错误
 * @param rule - 限流规则
 * @param request - 请求对象
 * @param body - 请求体对象
 * @throws 如果请求数量超过限制则抛出规则配置的错误哨兵（默认 RATE_LIMITED）
 */
async function consumeRateLimit(rule: RateLimitRule, request: Request, body: Record<string, unknown>) {
  const rawKey = await rule.key(request, body);
  if (!rawKey)
    return;
  const now = new Date();
  const key = createBucketKey(rule.name, rawKey, rule.windowMs);
  const windowStart = new Date(Math.floor(Date.now() / rule.windowMs) * rule.windowMs);
  let record: RateLimitRecord | null = null;
  try {
    record = await incrementRateLimit(key, windowStart, rule.windowMs, now);
  } catch (error) {
    if (!isNamespaceNotFound(error))
      throw error;
    await ensureCollectionExists(COLLECTIONS.rateLimits);
    record = await incrementRateLimit(key, windowStart, rule.windowMs, now);
  }

  if ((record?.count ?? 0) > rule.limit)
    throw new Error(rule.error ?? "RATE_LIMITED");
}

/**
 * 根据请求路径和请求体返回适用的限流规则列表。
 * 免费分析使用可恢复令牌：登录用户按账号计数，游客分别按 fingerprint 与 IP 计数，任一额度耗尽即拒绝。
 * @param request - HTTP 请求对象
 * @param body - 请求体对象
 * @returns 适用于该请求的限流规则数组
 */
async function rulesForRequest(request: Request, body: Record<string, unknown>): Promise<RateLimitRule[]> {
  if (pathMatches(request, "/api/v2/rpc/accounts.sendEmailBindingCode")) {
    return [{
      name: "email_binding_ip",
      limit: 3,
      windowMs: ONE_MINUTE_MS,
      key: currentRequest => normalizeIp(currentRequest),
    }, {
      name: "email_binding_email",
      limit: 3,
      windowMs: ONE_MINUTE_MS,
      key: (_currentRequest, currentBody) => normalizeEmail(currentBody.email),
    }];
  }

  if (pathMatches(request, "/api/v2/rpc/billing.redeemOrder")) {
    return [{
      name: "order_redeem",
      limit: 10,
      windowMs: ONE_MINUTE_MS,
      key: async currentRequest => {
        const user = await getCurrentUser(currentRequest.headers);
        return user ? String(user.uid) : null;
      },
    }];
  }

  if (pathMatches(request, "/api/v2/analysis/tasks")) {
    const user = await getCurrentUser(request.headers);
    const modelId = typeof body.modelId === "string" ? body.modelId : "";
    if (getCachedEffectiveGradingModelById(modelId)?.premium === true)
      return [];

    const fingerprint = typeof body.fingerprint === "string" ? body.fingerprint.trim() : "";
    const hasConsumption = user ? await hasDonatedAccount(user.uid) : false;
    const windowMs = hasConsumption ? SPONSOR_FREE_ANALYSIS_REFILL_MS : STANDARD_FREE_ANALYSIS_REFILL_MS;
    if (user) {
      return [{
        name: "free_analysis_account_tokens",
        limit: FREE_ANALYSIS_TOKEN_CAPACITY,
        windowMs,
        error: "ANALYSIS_QUOTA_EXCEEDED",
        key: () => `uid:${user.uid}`,
      }];
    }

    const rules: RateLimitRule[] = [{
      name: "free_analysis_ip_tokens",
      limit: FREE_ANALYSIS_TOKEN_CAPACITY,
      windowMs,
      error: "ANALYSIS_QUOTA_EXCEEDED",
      key: currentRequest => `ip:${normalizeIp(currentRequest)}`,
    }];
    if (fingerprint) {
      rules.unshift({
        name: "free_analysis_fingerprint_tokens",
        limit: FREE_ANALYSIS_TOKEN_CAPACITY,
        windowMs,
        error: "ANALYSIS_QUOTA_EXCEEDED",
        key: () => `fp:${fingerprint}`,
      });
    }
    return rules;
  }

  return [];
}

/**
 * 只读查询免费额度，复用提交规则；游客取 IP 与指纹额度的较小值。
 * @param request - 当前请求，用于确定账号与 IP
 * @param fingerprint - 与分析提交相同的浏览器指纹
 * @returns 剩余次数、恢复间隔与下一次可用额度的恢复时间
 */
export async function getFreeAnalysisQuota(request: Request, fingerprint: string): Promise<{
  remaining: number;
  capacity: number;
  refillMs: number;
  nextRefillAt: string | null;
}> {
  const rules = await rulesForRequest(new Request(new URL("/api/v2/analysis/tasks", request.url), {
    headers: request.headers,
  }), { fingerprint });
  const now = Date.now();
  const quotas = await Promise.all(rules.map(async (rule) => {
    const identity = await rule.key(request, { fingerprint });
    const keys = Array.from({ length: FREE_ANALYSIS_TOKEN_CAPACITY }, (_, slot) =>
      createFreeAnalysisTokenKey(identity!, slot));
    const records = await findMany<FreeAnalysisTokenSlot>(COLLECTIONS.rateLimits, { key: { $in: keys } });
    const pending = records
      .map(record => new Date(record.lastUsedAt).getTime() + rule.windowMs)
      .filter(time => time > now)
      .sort((a, b) => a - b);
    return {
      remaining: FREE_ANALYSIS_TOKEN_CAPACITY - pending.length,
      nextRefill: pending[0] ?? null,
    };
  }));
  const remaining = Math.min(...quotas.map(quota => quota.remaining));
  const nextRefill = remaining < FREE_ANALYSIS_TOKEN_CAPACITY
    ? Math.max(...quotas.filter(quota => quota.remaining === remaining).map(quota => quota.nextRefill ?? now))
    : null;
  return {
    remaining,
    capacity: FREE_ANALYSIS_TOKEN_CAPACITY,
    refillMs: rules[0].windowMs,
    nextRefillAt: nextRefill === null ? null : new Date(nextRefill).toISOString(),
  };
}

/**
 * 验证请求是否触发限流规则，若多条规则匹配将依次执行。
 * 对于敏感接口会按 IP、邮箱或用户身份计数；免费分析令牌按身份独立恢复。
 * @param request - HTTP 请求对象
 */
export async function assertRateLimit(request: Request) {
  const body = await readJsonBody(request);
  const rules = await rulesForRequest(request, body);
  for (const rule of rules) {
    const rawKey = await rule.key(request, body);
    if (!rawKey)
      continue;
    if (rule.name.endsWith("_tokens")) {
      await consumeFreeAnalysisToken(rawKey, rule.windowMs);
      continue;
    }
    await consumeRateLimit(rule, request, body);
  }
}

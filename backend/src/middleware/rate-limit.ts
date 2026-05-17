import crypto from "node:crypto";
import { getServerConfig } from "../config";
import { COLLECTIONS, ensureCollectionExists, findOneAndUpdate } from "../db/mongo";
import { getRequestIp } from "../utils/request";
import { normalizeEmail } from "../utils/validators";
import { getCurrentUser } from "./auth";

interface RateLimitRecord {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
  key: (request: Request, body: Record<string, unknown>) => Promise<string | null> | string | null;
}

const ONE_MINUTE_MS = 60 * 1000;
const FIVE_HOURS_MS = 5 * 60 * ONE_MINUTE_MS;
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
 * 执行单条限流规则，计数并在超出限制时抛出错误
 * @param rule - 限流规则
 * @param request - 请求对象
 * @param body - 请求体对象
 * @throws 如果请求数量超过限制则抛出 RATE_LIMITED 错误
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
    throw new Error("RATE_LIMITED");
}

/**
 * 根据请求路径返回适用的限流规则列表
 * @param request - 请求对象
 * @returns 适用于该请求的限流规则数组
 */
function rulesForRequest(request: Request): RateLimitRule[] {
  if (pathMatches(request, "/api/v2/rpc/auth.login")) {
    return [{
      name: "login",
      limit: 5,
      windowMs: ONE_MINUTE_MS,
      key: (currentRequest, body) => `${normalizeIp(currentRequest)}:${normalizeEmail(body.email)}`,
    }];
  }

  if (pathMatches(request, "/api/v2/rpc/auth.sendVerificationCode")) {
    return [{
      name: "verification_ip",
      limit: 3,
      windowMs: ONE_MINUTE_MS,
      key: currentRequest => normalizeIp(currentRequest),
    }, {
      name: "verification_email",
      limit: 3,
      windowMs: ONE_MINUTE_MS,
      key: (_currentRequest, body) => normalizeEmail(body.email),
    }];
  }

  if (pathMatches(request, "/api/v2/rpc/auth.sendPasswordResetCode")) {
    return [{
      name: "password_reset",
      limit: 3,
      windowMs: ONE_MINUTE_MS,
      key: (currentRequest, body) => `${normalizeIp(currentRequest)}:${normalizeEmail(body.email)}`,
    }];
  }

  if (pathMatches(request, "/api/v2/rpc/billing.redeemOrder")) {
    return [{
      name: "order_redeem",
      limit: 10,
      windowMs: ONE_MINUTE_MS,
      key: async (currentRequest) => {
        const user = await getCurrentUser(currentRequest.headers);
        return user ? String(user.uid) : null;
      },
    }];
  }

  if (pathMatches(request, "/api/v2/rpc/oauth.qqStart") || pathMatches(request, "/api/v2/rpc/oauth.afdianStart")) {
    return [{
      name: "oauth_start",
      limit: 10,
      windowMs: ONE_MINUTE_MS,
      key: currentRequest => normalizeIp(currentRequest),
    }];
  }

  if (pathMatches(request, "/api/v2/analysis/tasks")) {
    return [{
      name: "anonymous_analysis",
      limit: 5,
      windowMs: FIVE_HOURS_MS,
      key: async (currentRequest, body) => {
        const user = await getCurrentUser(currentRequest.headers);
        if (user)
          return null;
        const fingerprint = typeof body.fingerprint === "string" ? body.fingerprint.trim() : "missing";
        return `${normalizeIp(currentRequest)}:${fingerprint}`;
      },
    }];
  }

  return [];
}

/**
 * 验证请求是否触发限流规则，若多条规则匹配将依次执行
 *
 * 对于敏感接口（如登录、验证码发送、订单兑换、匿名分析等）会按 IP、
 * 邮箱或用户 ID 进行计数，超出阈值将抛出 RATE_LIMITED 错误由上层统一处理。
 * @param request - 请求对象
 * @throws 如果请求数量超过限制则抛出 RATE_LIMITED 错误
 * @throws 如果请求体过大则抛出 PAYLOAD_TOO_LARGE 错误
 */
export async function assertRateLimit(request: Request) {
  const rules = rulesForRequest(request);
  if (rules.length === 0)
    return;
  const body = await readJsonBody(request);
  for (const rule of rules) {
    await consumeRateLimit(rule, request, body);
  }
}

import type { AuthUser } from "@ink-battles/shared/types/users/user";
import crypto from "node:crypto";
import { Elysia } from "elysia";
import { getConfig } from "../config";
import { COLLECTIONS, findOne, insertOne, updateOne } from "../db/mongo";
import { createUser, generateNextUID, getUserByAfdian, getUserByQQ } from "../db/repositories";
import { exchangeAfdianCode } from "../integrations/afdian";
import { getCurrentUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { redirectWithMessage } from "../utils/response";
import { issueLoginResponse } from "./auth";
import { initializeUserBilling } from "./billing";

interface OAuthState { method: "signin" | "signup" | "bind"; inviteCode?: string }

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const VALID_OAUTH_METHODS = new Set(["signin", "signup", "bind"]);

/**
 * 获取请求的公网 Base URL，用于构建 OAuth 回调地址
 * @param request - HTTP 请求对象
 * @returns 公网 Base URL 字符串
 */
function getRequestPublicBaseUrl(request: Request) {
  const configuredBaseUrl = getConfig().app.base_url;
  if (configuredBaseUrl && !configuredBaseUrl.includes("localhost"))
    return configuredBaseUrl;

  return new URL(request.url).origin;
}

/**
 * 根据请求和路径构建完整的公网 URL
 * @param request - HTTP 请求对象
 * @param path - 相对路径
 * @returns 完整的公网 URL 字符串
 */
function createPublicUrl(request: Request, path: string) {
  return new URL(path, getRequestPublicBaseUrl(request)).toString();
}

/**
 * 获取爱发电 OAuth 的回调地址配置
 * @returns 爱发电回调 URI 字符串
 */
const getAfdianRedirectUri = () => getConfig().afdian.redirect_uri;

/**
 * 规范化 OAuth 方法参数，将未知值归一为合法的 OAuth 方法类型
 * @param value - 原始的 OAuth 方法值
 * @returns 规范化后的 OAuth 方法，默认为 "signin"
 */
function normalizeOAuthMethod(value: unknown): OAuthState["method"] {
  return value === "signup" || value === "bind" ? value : "signin";
}

/**
 * 将字符串编码为 base64url 格式
 * @param value - 待编码的字符串
 * @returns base64url 编码后的字符串
 */
const encodeBase64Url = (value: string) => Buffer.from(value).toString("base64url");

/**
 * 使用 JWT 密钥对 state 载荷进行 HMAC-SHA256 签名
 * @param payload - 待签名的载荷字符串
 * @returns base64url 格式的签名字符串
 */
function signStatePayload(payload: string) {
  return crypto.createHmac("sha256", getConfig().jwt.secret).update(payload).digest("base64url");
}

/**
 * 创建带签名的 OAuth state 参数，包含时间戳和随机数以防止重放攻击
 * @param input - 包含 OAuth 方法和可选邀请码的状态对象
 * @returns 格式为 "payload.signature" 的 state 字符串
 */
function createState(input: OAuthState) {
  const payload = encodeBase64Url(JSON.stringify({
    ...input,
    timestamp: Date.now(),
    random: crypto.randomUUID(),
  }));
  return `${payload}.${signStatePayload(payload)}`;
}

/**
 * 校验并规范化解析后的 OAuth state 对象，验证方法合法性和时间戳有效性
 * @param parsed - 解析后的原始 state 对象
 * @returns 规范化后的 OAuth state 对象，若校验失败则返回 null
 */
function normalizeParsedState(parsed: OAuthState & { timestamp?: number }): OAuthState | null {
  if (!VALID_OAUTH_METHODS.has(parsed.method) || typeof parsed.timestamp !== "number")
    return null;
  if (Date.now() - parsed.timestamp > OAUTH_STATE_TTL_MS)
    return null;
  return { method: parsed.method, inviteCode: parsed.inviteCode };
}

/**
 * 解析并验证 OAuth state 字符串的签名与有效期
 * @param value - 待解析的 state 字符串，可为 null
 * @returns 解析成功返回 OAuth state 对象，失败返回 null
 */
function parseState(value: string | null): OAuthState | null {
  if (!value)
    return null;
  try {
    const [payload, signature] = value.split(".");
    if (!payload || !signature || signature !== signStatePayload(payload))
      return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as OAuthState & { timestamp?: number };
    return normalizeParsedState(parsed);
  } catch {
    return null;
  }
}

/**
 * 在需要邀请码的注册场景下校验并消耗邀请码，将其绑定到指定用户
 * @param inviteCode - 用户提交的邀请码
 * @param uid - 使用该邀请码的用户 UID
 * @returns 包含操作结果、错误消息及是否需要邀请码的对象
 */
async function consumeInviteIfNeeded(inviteCode: string | undefined, uid: number) {
  if (!getConfig().registration.invite_code_required)
    return { success: true };
  if (!inviteCode)
    return { success: false, message: "当前注册需要邀请码", needInviteCode: true };
  const invite = await findOne(COLLECTIONS.inviteCodes, { code: inviteCode.trim().toUpperCase(), used: { $ne: true } });
  if (!invite)
    return { success: false, message: "邀请码无效或已使用", needInviteCode: true };
  await updateOne(COLLECTIONS.inviteCodes, { _id: invite._id }, { used: true, usedBy: uid, usedAt: new Date() });
  return { success: true };
}

/**
 * 通过第三方授权码获取 QQ 用户信息
 * @param code - QQ OAuth 授权码
 * @returns QQ 用户信息对象，包含 openid、昵称和头像
 * @throws 当 API 返回错误或数据格式不正确时抛出异常
 */
async function qqInfo(code: string) {
  const response = await fetch(`https://api-space.tnxg.top/user/get?code=${code}`);
  const data = await response.json();
  if (data.status !== "success" || !data.data?.qq_openid)
    throw new Error(data.message || "获取 QQ 用户信息失败");
  return data.data as { qq_openid: string; nickname?: string; avatar?: string };
}

/**
 * 创建或更新爱发电用户信息记录
 * @param uid - 用户 UID
 * @param afdId - 爱发电用户 ID
 * @param nickname - 用户昵称（可选）
 * @param avatar - 用户头像 URL（可选）
 */
async function upsertAfdUser(uid: number, afdId: string, nickname?: string, avatar?: string) {
  const data = { uid, afdId, nickname, avatar, updatedAt: new Date() };
  const existed = await findOne(COLLECTIONS.afdUsers, { uid });
  if (existed)
    await updateOne(COLLECTIONS.afdUsers, { uid }, data);
  else await insertOne(COLLECTIONS.afdUsers, data);
}

/**
 * OAuth 认证成功后重定向用户并设置登录 Cookie
 * @param request - HTTP 请求对象
 * @param uid - 用户 UID
 * @param path - 重定向目标路径，默认为 "/dashboard"
 * @returns 包含重定向和 Cookie 的 Response 对象
 */
async function redirectAfterAuth(request: Request, uid: number, path = "/dashboard") {
  const loginResponse = await issueLoginResponse(uid, {}, request);
  return new Response(null, {
    status: 302,
    headers: {
      "Location": createPublicUrl(request, path),
      "Set-Cookie": loginResponse.headers.get("Set-Cookie") ?? "",
    },
  });
}

/**
 * 处理爱发电 OAuth 回调，完成用户登录、注册或账号绑定流程
 * @param request - HTTP 请求对象
 * @returns 重定向响应，根据不同场景跳转到相应页面
 */
async function handleAfdianCallback(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = parseState(url.searchParams.get("state"));
  if (!code || !state)
    return redirectWithMessage("/signin", "afdian_error", "缺少必要参数", getRequestPublicBaseUrl(request));

  try {
    const data = await exchangeAfdianCode(code, getAfdianRedirectUri());
    if (data.ec !== 200 || !data.data?.user_id)
      throw new Error(data.em || "获取爱发电用户信息失败");
    const { user_id: afdId, name, avatar } = data.data;
    if (state.method === "bind") {
      const currentUser = await getCurrentUser(request.headers);
      if (!currentUser)
        return redirectWithMessage("/signin", "afdian_bind_need_login", "请先登录后再绑定爱发电", getRequestPublicBaseUrl(request));
      const existing = await getUserByAfdian(afdId);
      if (existing && existing.uid !== currentUser.uid)
        return redirectWithMessage("/dashboard/accounts", "afdian_bind_error", "该爱发电账号已被其他账号绑定", getRequestPublicBaseUrl(request));
      await updateOne<AuthUser>(COLLECTIONS.users, { uid: currentUser.uid }, { afdId, updatedAt: new Date() });
      await upsertAfdUser(currentUser.uid, afdId, name, avatar);
      writeAuditLog({ event: "oauth_bind", uid: currentUser.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "afdian" } });
      return redirectWithMessage("/dashboard/accounts", "afdian_bind_success", "绑定成功", getRequestPublicBaseUrl(request));
    }

    let user = await getUserByAfdian(afdId);
    if (!user) {
      const uid = await generateNextUID();
      const invite = await consumeInviteIfNeeded(state.inviteCode, uid);
      if (!invite.success)
        return redirectWithMessage("/signup", "need_invite_code", invite.message!, getRequestPublicBaseUrl(request));
      await createUser({ uid, afdId, loginMethod: "afd", isActive: true, createdAt: new Date(), updatedAt: new Date() });
      await initializeUserBilling(uid);
      await upsertAfdUser(uid, afdId, name, avatar);
      user = await getUserByAfdian(afdId);
    }
    writeAuditLog({ event: "oauth_login", uid: user!.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "afdian" } });
    return redirectAfterAuth(request, user!.uid);
  } catch (error) {
    return redirectWithMessage("/signin", "afdian_error", error instanceof Error ? error.message : "爱发电登录失败", getRequestPublicBaseUrl(request));
  }
}

export const oauthModule = new Elysia()
  .get("/api/v2/rpc/oauth.qqStart", ({ request, query }) => {
    const state = createState({
      method: normalizeOAuthMethod(query.method),
      inviteCode: typeof query.inviteCode === "string" ? query.inviteCode : undefined,
    });
    const authUrl = new URL("https://api-space.tnxg.top/oauth/qq/authorize");
    authUrl.searchParams.set("redirect", "true");
    authUrl.searchParams.set("return_url", createPublicUrl(request, "/api/v2/rpc/oauth.qqCallback"));
    authUrl.searchParams.set("state", state);
    return Response.redirect(authUrl.toString(), 302);
  }, { detail: { tags: ["RPC: OAuth"] } })
  .get("/api/v2/rpc/oauth.afdianStart", ({ query }) => {
    const { afdian } = getConfig();
    const state = createState({
      method: normalizeOAuthMethod(query.method),
      inviteCode: typeof query.inviteCode === "string" ? query.inviteCode : undefined,
    });
    const authUrl = new URL("https://ifdian.net/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "basic");
    authUrl.searchParams.set("client_id", afdian.client_id);
    authUrl.searchParams.set("redirect_uri", getAfdianRedirectUri());
    authUrl.searchParams.set("state", state);
    return Response.redirect(authUrl, 302);
  }, { detail: { tags: ["RPC: OAuth"] } })
  .get("/api/v2/rpc/oauth.qqCallback", async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = parseState(url.searchParams.get("state"));
    if (!code || !state)
      return redirectWithMessage("/signin", "qq_error", "缺少必要参数", getRequestPublicBaseUrl(request));

    try {
      const qq = await qqInfo(code);
      if (state.method === "bind") {
        const currentUser = await getCurrentUser(request.headers);
        if (!currentUser)
          return redirectWithMessage("/signin", "qq_bind_need_login", "请先登录后再绑定 QQ", getRequestPublicBaseUrl(request));
        const existing = await getUserByQQ(qq.qq_openid);
        if (existing && existing.uid !== currentUser.uid)
          return redirectWithMessage("/dashboard/accounts", "qq_bind_error", "该 QQ 账号已被其他用户绑定", getRequestPublicBaseUrl(request));
        await updateOne<AuthUser>(COLLECTIONS.users, { uid: currentUser.uid }, { qqOpenid: qq.qq_openid, avatar: qq.avatar, nickname: qq.nickname, updatedAt: new Date() });
        writeAuditLog({ event: "oauth_bind", uid: currentUser.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "qq" } });
        return redirectWithMessage("/dashboard/accounts", "qq_bind_success", "QQ 账号绑定成功", getRequestPublicBaseUrl(request));
      }

      let user = await getUserByQQ(qq.qq_openid);
      if (!user) {
        const uid = await generateNextUID();
        const invite = await consumeInviteIfNeeded(state.inviteCode, uid);
        if (!invite.success)
          return redirectWithMessage("/signup", "need_invite_code", invite.message!, getRequestPublicBaseUrl(request));
        await createUser({ uid, qqOpenid: qq.qq_openid, loginMethod: "qq", avatar: qq.avatar, nickname: qq.nickname, isActive: true, createdAt: new Date(), updatedAt: new Date() });
        await initializeUserBilling(uid);
        user = await getUserByQQ(qq.qq_openid);
      }
      writeAuditLog({ event: "oauth_login", uid: user!.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "qq" } });
      return redirectAfterAuth(request, user!.uid);
    } catch (error) {
      return redirectWithMessage("/signin", "qq_error", error instanceof Error ? error.message : "QQ 登录失败", getRequestPublicBaseUrl(request));
    }
  }, { detail: { tags: ["RPC: OAuth"] } })
  .get("/api/v2/rpc/oauth.afdianCallback", ({ request }) => handleAfdianCallback(request), { detail: { tags: ["RPC: OAuth"] } })
  .get("/oauth/afdian/callback", ({ request }) => handleAfdianCallback(request), { detail: { tags: ["RPC: OAuth"] } });

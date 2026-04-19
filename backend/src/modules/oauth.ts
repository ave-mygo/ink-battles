import type { AuthUser } from "../types";
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
interface SignedOAuthState extends OAuthState { timestamp: number; random: string; signature?: string }

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const VALID_OAUTH_METHODS = new Set(["signin", "signup", "bind"]);

const firstForwardedValue = (value: string | null) => value?.split(",")[0]?.trim() || null;

/**
 * 获取请求的公网 Base URL，用于构建 OAuth 回调地址。
 * 优先级：config.app.base_url > x-forwarded headers > request URL
 */
const getRequestPublicBaseUrl = (request: Request) => {
	// 优先使用配置的公网地址（生产环境必须配置）
	const configBaseUrl = getConfig().app.base_url;
	if (configBaseUrl && !configBaseUrl.includes("localhost"))
		return configBaseUrl;

	// 回退到反向代理 headers
	const requestUrl = new URL(request.url);
	const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
	const host = forwardedHost || firstForwardedValue(request.headers.get("host"));
	const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
	const protocol = forwardedProto || requestUrl.protocol.replace(/:$/, "");

	if (host)
		return `${protocol}://${host}`;

	return configBaseUrl;
};

const createPublicUrl = (request: Request, path: string) =>
	new URL(path, getRequestPublicBaseUrl(request)).toString();

const createQqAuthorizeUrl = (state: string, returnUrl: string) => {
	const authUrl = new URL("https://api-space.tnxg.top/oauth/qq/authorize");
	const params = new URLSearchParams({
		state,
		redirect: "true",
	});

	// api-space 的文档示例要求 return_url 作为顶层 URL 参数传递。
	// 这里保持 return_url 原始 URL 形态，避免被中转服务再次写入 state 后无法还原。
	return `${authUrl.toString()}?${params.toString()}&return_url=${returnUrl}`;
};

const normalizeOAuthMethod = (value: unknown): OAuthState["method"] =>
	value === "signup" || value === "bind" ? value : "signin";

const encodeBase64Url = (value: string) => Buffer.from(value).toString("base64url");

const signStatePayload = (payload: string) =>
	crypto.createHmac("sha256", getConfig().jwt.secret).update(payload).digest("base64url");

const createStatePayload = (input: OAuthState): SignedOAuthState => ({
	...input,
	timestamp: Date.now(),
	random: crypto.randomUUID(),
});

const createState = (input: OAuthState) => {
	const payload = encodeBase64Url(JSON.stringify(createStatePayload(input)));
	return `${payload}.${signStatePayload(payload)}`;
};

const createJsonState = (input: OAuthState) => {
	const state = createStatePayload(input);
	const payload = encodeBase64Url(JSON.stringify(state));
	return JSON.stringify({
		...state,
		signature: signStatePayload(payload),
	});
};

const normalizeParsedState = (parsed: SignedOAuthState): OAuthState | null => {
	if (!VALID_OAUTH_METHODS.has(parsed.method) || typeof parsed.timestamp !== "number")
		return null;
	if (Date.now() - parsed.timestamp > OAUTH_STATE_TTL_MS)
		return null;
	return { method: parsed.method, inviteCode: parsed.inviteCode };
};

const parseJsonState = (value: string): OAuthState | null => {
	const parsed = JSON.parse(value) as SignedOAuthState;
	if (!parsed.signature)
		return normalizeParsedState(parsed);

	const { signature, ...state } = parsed;
	const payload = encodeBase64Url(JSON.stringify(state));
	if (signature !== signStatePayload(payload))
		return null;

	return normalizeParsedState(parsed);
};

const parseState = (value: string | null): OAuthState | null => {
	if (!value)
		return null;
	try {
		if (value.startsWith("{"))
			return parseJsonState(value);

		const [payload, signature] = value.split(".");
		if (!payload || !signature || signature !== signStatePayload(payload))
			return null;
		const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as SignedOAuthState;
		return normalizeParsedState(parsed);
	} catch {
		return null;
	}
};

const consumeInviteIfNeeded = async (inviteCode: string | undefined, uid: number) => {
	if (!getConfig().registration.invite_code_required)
		return { success: true };
	if (!inviteCode)
		return { success: false, message: "当前注册需要邀请码", needInviteCode: true };
	const invite = await findOne(COLLECTIONS.inviteCodes, { code: inviteCode.trim().toUpperCase(), used: { $ne: true } });
	if (!invite)
		return { success: false, message: "邀请码无效或已使用", needInviteCode: true };
	await updateOne(COLLECTIONS.inviteCodes, { _id: invite._id }, { used: true, usedBy: uid, usedAt: new Date() });
	return { success: true };
};

const qqInfo = async (code: string) => {
	const response = await fetch(`https://api-space.tnxg.top/user/get?code=${code}`);
	const data = await response.json();
	if (data.status !== "success" || !data.data?.qq_openid)
		throw new Error(data.message || "获取 QQ 用户信息失败");
	return data.data as { qq_openid: string; nickname?: string; avatar?: string };
};

const upsertAfdUser = async (uid: number, afdId: string, nickname?: string, avatar?: string) => {
	const data = { uid, afdId, nickname, avatar, updatedAt: new Date() };
	const existed = await findOne(COLLECTIONS.afdUsers, { uid });
	if (existed)
		await updateOne(COLLECTIONS.afdUsers, { uid }, data);
	else await insertOne(COLLECTIONS.afdUsers, data);
};

const redirectAfterAuth = async (request: Request, uid: number, path = "/dashboard") => {
	const loginResponse = await issueLoginResponse(uid, {}, request);
	return new Response(null, {
		status: 302,
		headers: {
			"Location": createPublicUrl(request, path),
			"Set-Cookie": loginResponse.headers.get("Set-Cookie") ?? "",
		},
	});
};

export const oauthModule = new Elysia()
	.get("/api/v2/rpc/oauth.qqStart", ({ request, query }) => {
		const state = createJsonState({
			method: normalizeOAuthMethod(query.method),
			inviteCode: typeof query.inviteCode === "string" ? query.inviteCode : undefined,
		});
		return Response.redirect(createQqAuthorizeUrl(state, createPublicUrl(request, "/oauth/qq/callback")), 302);
	}, { detail: { tags: ["RPC: OAuth"] } })
	.get("/api/v2/rpc/oauth.afdianStart", ({ request, query }) => {
		const { afdian } = getConfig();
		const state = createState({
			method: normalizeOAuthMethod(query.method),
			inviteCode: typeof query.inviteCode === "string" ? query.inviteCode : undefined,
		});
		const authUrl = new URL("https://ifdian.net/oauth2/authorize");
		authUrl.searchParams.set("response_type", "code");
		authUrl.searchParams.set("scope", "basic");
		authUrl.searchParams.set("client_id", afdian.client_id);
		authUrl.searchParams.set("redirect_uri", createPublicUrl(request, "/oauth/afdian/callback"));
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
	.get("/api/v2/rpc/oauth.afdianCallback", async ({ request }) => {
		const url = new URL(request.url);
		const code = url.searchParams.get("code");
		const state = parseState(url.searchParams.get("state"));
		if (!code || !state)
			return redirectWithMessage("/signin", "afdian_error", "缺少必要参数", getRequestPublicBaseUrl(request));

		try {
			const data = await exchangeAfdianCode(code, createPublicUrl(request, "/oauth/afdian/callback"));
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
	}, { detail: { tags: ["RPC: OAuth"] } });

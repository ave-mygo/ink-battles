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

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const VALID_OAUTH_METHODS = new Set(["signin", "signup", "bind"]);

const normalizeOAuthMethod = (value: unknown): OAuthState["method"] =>
	value === "signup" || value === "bind" ? value : "signin";

const encodeBase64Url = (value: string) => Buffer.from(value).toString("base64url");

const signStatePayload = (payload: string) =>
	crypto.createHmac("sha256", getConfig().jwt.secret).update(payload).digest("base64url");

const createState = (input: OAuthState) => {
	const payload = encodeBase64Url(JSON.stringify({
		...input,
		timestamp: Date.now(),
		random: crypto.randomUUID(),
	}));
	return `${payload}.${signStatePayload(payload)}`;
};

const parseState = (value: string | null): OAuthState | null => {
	if (!value)
		return null;
	try {
		const [payload, signature] = value.split(".");
		if (!payload || !signature || signature !== signStatePayload(payload))
			return null;
		const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as OAuthState & { timestamp?: number };
		if (!VALID_OAUTH_METHODS.has(parsed.method) || typeof parsed.timestamp !== "number")
			return null;
		if (Date.now() - parsed.timestamp > OAUTH_STATE_TTL_MS)
			return null;
		return { method: parsed.method, inviteCode: parsed.inviteCode };
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

const redirectAfterAuth = async (uid: number, path = "/dashboard") => {
	const loginResponse = await issueLoginResponse(uid);
	return new Response(null, {
		status: 302,
		headers: {
			"Location": new URL(path, getConfig().app.base_url).toString(),
			"Set-Cookie": loginResponse.headers.get("Set-Cookie") ?? "",
		},
	});
};

export const oauthModule = new Elysia()
	.get("/api/v2/rpc/oauth.qqStart", ({ query }) => {
		const state = createState({
			method: normalizeOAuthMethod(query.method),
			inviteCode: typeof query.inviteCode === "string" ? query.inviteCode : undefined,
		});
		const authUrl = new URL("https://api-space.tnxg.top/oauth/qq/authorize");
		authUrl.searchParams.set("redirect", "true");
		authUrl.searchParams.set("return_url", `${getConfig().app.base_url}/api/v2/rpc/oauth.qqCallback`);
		authUrl.searchParams.set("state", state);
		return Response.redirect(authUrl, 302);
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
		authUrl.searchParams.set("redirect_uri", `${getConfig().app.base_url}/api/v2/rpc/oauth.afdianCallback`);
		authUrl.searchParams.set("state", state);
		return Response.redirect(authUrl, 302);
	}, { detail: { tags: ["RPC: OAuth"] } })
	.get("/api/v2/rpc/oauth.qqCallback", async ({ request }) => {
		const url = new URL(request.url);
		const code = url.searchParams.get("code");
		const state = parseState(url.searchParams.get("state"));
		if (!code || !state)
			return redirectWithMessage("/signin", "qq_error", "缺少必要参数", getConfig().app.base_url);

		try {
			const qq = await qqInfo(code);
			if (state.method === "bind") {
				const currentUser = await getCurrentUser(request.headers);
				if (!currentUser)
					return redirectWithMessage("/signin", "qq_bind_need_login", "请先登录后再绑定 QQ", getConfig().app.base_url);
				const existing = await getUserByQQ(qq.qq_openid);
				if (existing && existing.uid !== currentUser.uid)
					return redirectWithMessage("/dashboard/accounts", "qq_bind_error", "该 QQ 账号已被其他用户绑定", getConfig().app.base_url);
				await updateOne<AuthUser>(COLLECTIONS.users, { uid: currentUser.uid }, { qqOpenid: qq.qq_openid, avatar: qq.avatar, nickname: qq.nickname, updatedAt: new Date() });
				writeAuditLog({ event: "oauth_bind", uid: currentUser.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "qq" } });
				return redirectWithMessage("/dashboard/accounts", "qq_bind_success", "QQ 账号绑定成功", getConfig().app.base_url);
			}

			let user = await getUserByQQ(qq.qq_openid);
			if (!user) {
				const uid = await generateNextUID();
				const invite = await consumeInviteIfNeeded(state.inviteCode, uid);
				if (!invite.success)
					return redirectWithMessage("/signup", "need_invite_code", invite.message!, getConfig().app.base_url);
				await createUser({ uid, qqOpenid: qq.qq_openid, loginMethod: "qq", avatar: qq.avatar, nickname: qq.nickname, isActive: true, createdAt: new Date(), updatedAt: new Date() });
				await initializeUserBilling(uid);
				user = await getUserByQQ(qq.qq_openid);
			}
			writeAuditLog({ event: "oauth_login", uid: user!.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "qq" } });
			return redirectAfterAuth(user!.uid);
		} catch (error) {
			return redirectWithMessage("/signin", "qq_error", error instanceof Error ? error.message : "QQ 登录失败", getConfig().app.base_url);
		}
	}, { detail: { tags: ["RPC: OAuth"] } })
	.get("/api/v2/rpc/oauth.afdianCallback", async ({ request }) => {
		const url = new URL(request.url);
		const code = url.searchParams.get("code");
		const state = parseState(url.searchParams.get("state"));
		if (!code || !state)
			return redirectWithMessage("/signin", "afdian_error", "缺少必要参数", getConfig().app.base_url);

		try {
			const data = await exchangeAfdianCode(code);
			if (data.ec !== 200 || !data.data?.user_id)
				throw new Error(data.em || "获取爱发电用户信息失败");
			const { user_id: afdId, name, avatar } = data.data;
			if (state.method === "bind") {
				const currentUser = await getCurrentUser(request.headers);
				if (!currentUser)
					return redirectWithMessage("/signin", "afdian_bind_need_login", "请先登录后再绑定爱发电", getConfig().app.base_url);
				const existing = await getUserByAfdian(afdId);
				if (existing && existing.uid !== currentUser.uid)
					return redirectWithMessage("/dashboard/accounts", "afdian_bind_error", "该爱发电账号已被其他账号绑定", getConfig().app.base_url);
				await updateOne<AuthUser>(COLLECTIONS.users, { uid: currentUser.uid }, { afdId, updatedAt: new Date() });
				await upsertAfdUser(currentUser.uid, afdId, name, avatar);
				writeAuditLog({ event: "oauth_bind", uid: currentUser.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "afdian" } });
				return redirectWithMessage("/dashboard/accounts", "afdian_bind_success", "绑定成功", getConfig().app.base_url);
			}

			let user = await getUserByAfdian(afdId);
			if (!user) {
				const uid = await generateNextUID();
				const invite = await consumeInviteIfNeeded(state.inviteCode, uid);
				if (!invite.success)
					return redirectWithMessage("/signup", "need_invite_code", invite.message!, getConfig().app.base_url);
				await createUser({ uid, afdId, loginMethod: "afd", isActive: true, createdAt: new Date(), updatedAt: new Date() });
				await initializeUserBilling(uid);
				await upsertAfdUser(uid, afdId, name, avatar);
				user = await getUserByAfdian(afdId);
			}
			writeAuditLog({ event: "oauth_login", uid: user!.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "afdian" } });
			return redirectAfterAuth(user!.uid);
		} catch (error) {
			return redirectWithMessage("/signin", "afdian_error", error instanceof Error ? error.message : "爱发电登录失败", getConfig().app.base_url);
		}
	}, { detail: { tags: ["RPC: OAuth"] } });

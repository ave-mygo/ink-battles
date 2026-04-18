import type { AuthUser } from "../types";
import bcrypt from "bcryptjs";
import { Elysia, t } from "elysia";
import { COLLECTIONS, findOne, updateOne } from "../db/mongo";
import { requireUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { revokeUserSessions } from "../utils/auth-sessions";
import { consumeEmailCode } from "../utils/email-codes";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { isPasswordValid, normalizeEmail } from "../utils/validators";

const MINIMUM_PASSWORD_MESSAGE = "密码强度不足，至少需要 10 位并包含任意 3 种字符类型";

export const accountsModule = new Elysia()
	.get("/api/v2/accounts/details", async ({ request }) => {
		const user = await requireUser(request.headers);
		return {
			email: { bound: !!user.email, value: user.email },
			qq: { bound: !!user.qqOpenid, value: user.qqOpenid },
			afdian: { bound: !!user.afdId, value: user.afdId },
			loginMethod: user.loginMethod,
		};
	}, { detail: { tags: ["REST: Accounts"] } })
	.post("/api/v2/rpc/accounts.bindEmail", async ({ request, body }) => {
		const user = await requireUser(request.headers);
		const email = normalizeEmail(body.email);
		if (!isPasswordValid(body.password))
			return { success: false, message: MINIMUM_PASSWORD_MESSAGE };
		const verify = await consumeEmailCode(email, body.code, "register");
		if (!verify.success)
			return { success: false, message: "验证码错误或已过期" };
		const existing = await findOne<AuthUser>(COLLECTIONS.users, { email });
		if (existing && existing.uid !== user.uid)
			return { success: false, message: "该邮箱已被其他用户使用" };
		if (user.email)
			return { success: false, message: "您已绑定邮箱，请先解绑" };
		await updateOne<AuthUser>(COLLECTIONS.users, { uid: user.uid }, { email, passwordHash: await bcrypt.hash(body.password, 10), updatedAt: new Date() });
		await revokeUserSessions(user.uid);
		writeAuditLog({ event: "account_bound", uid: user.uid, email, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "email" } });
		return { success: true, message: "邮箱绑定成功" };
	}, { body: t.Object({ email: t.String(), code: t.String(), password: t.String() }), detail: { tags: ["RPC: Accounts"] } })
	.post("/api/v2/rpc/accounts.unbindEmail", async ({ request }) => {
		const user = await requireUser(request.headers);
		if (!user.email)
			return { success: false, message: "您尚未绑定邮箱" };
		if (!user.qqOpenid && user.loginMethod === "email")
			return { success: false, message: "至少需要保留一种登录方式" };
		await updateOne<AuthUser>(COLLECTIONS.users, { uid: user.uid }, { email: null, passwordHash: null, updatedAt: new Date() });
		writeAuditLog({ event: "account_unbound", uid: user.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "email" } });
		return { success: true, message: "邮箱解绑成功" };
	}, { detail: { tags: ["RPC: Accounts"] } })
	.post("/api/v2/rpc/accounts.unbindQQ", async ({ request }) => {
		const user = await requireUser(request.headers);
		if (!user.qqOpenid)
			return { success: false, message: "您尚未绑定 QQ 账号" };
		if (!user.email && user.loginMethod === "qq")
			return { success: false, message: "至少需要保留一种登录方式" };
		await updateOne<AuthUser>(COLLECTIONS.users, { uid: user.uid }, { qqOpenid: null, updatedAt: new Date() });
		writeAuditLog({ event: "account_unbound", uid: user.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "qq" } });
		return { success: true, message: "QQ 账号解绑成功" };
	}, { detail: { tags: ["RPC: Accounts"] } })
	.post("/api/v2/rpc/accounts.unbindAfdian", async ({ request }) => {
		const user = await requireUser(request.headers);
		if (!user.afdId)
			return { success: false, message: "您尚未绑定爱发电账号" };
		if (!user.email && !user.qqOpenid && user.loginMethod === "afd")
			return { success: false, message: "至少需要保留一种登录方式" };
		if (await findOne(COLLECTIONS.afdOrders, { uid: user.uid }))
			return { success: false, message: "您已有兑换订单，无法解绑爱发电账号" };
		await updateOne<AuthUser>(COLLECTIONS.users, { uid: user.uid }, { afdId: null, updatedAt: new Date() });
		writeAuditLog({ event: "account_unbound", uid: user.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request), metadata: { provider: "afdian" } });
		return { success: true, message: "爱发电账号解绑成功" };
	}, { detail: { tags: ["RPC: Accounts"] } });

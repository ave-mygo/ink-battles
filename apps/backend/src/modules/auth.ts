import { Elysia } from "elysia";
import { canReviewExcellentSentences, getCookies, getCurrentUserWithToken, isAdminUser, isHonoraryWriterUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { createAuthSession, revokeAuthSession } from "../utils/auth-sessions";
import { authCookie, clearAuthCookies, gravatarUrl, normalizeAuthCookies, signAuthToken, verifyAuthTokenPayload } from "../utils/crypto";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { safeUser } from "../utils/response";

/**
 * 为业务侧 OAuth 登录签发站点会话。
 *
 * 邮箱密码登录已经迁移到统一 Auth 服务；这个 helper 仅供 QQ/爱发电 OAuth
 * 回调复用相同的 auth-token 与 auth_sessions 校验模型。
 */
export async function issueLoginResponse(uid: number, data: Record<string, unknown> = {}, request?: Request) {
  const session = await createAuthSession(uid, { userAgent: request ? getRequestUserAgent(request) : null });
  const token = await signAuthToken(uid, session.sessionId);
  return new Response(JSON.stringify({ success: true, message: "登录成功", ...data }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": authCookie(token) },
  });
}

export const authModule = new Elysia()
  .get("/api/v2/auth/me", async ({ request }) => {
    const session = await getCurrentUserWithToken(request.headers);
    if (!session)
      return { success: false, message: "未登录", data: null };
    const user = session.user;
    const safe = safeUser(user as unknown as Record<string, unknown>);
    if (!safe)
      return { success: false, message: "未登录", data: null };
    const avatar = user?.avatar || (user?.email ? gravatarUrl(user.email, user.uid) : gravatarUrl("", user!.uid));
    const response = {
      success: true,
      data: {
        ...safe,
        avatar,
        isAdmin: isAdminUser(user),
        isHonoraryWriter: await isHonoraryWriterUser(user),
        canReviewExcellentSentences: await canReviewExcellentSentences(user),
      },
    };
    return new Response(JSON.stringify(response), {
      headers: normalizedAuthHeaders(session.token),
    });
  }, { detail: { tags: ["REST: Auth"] } })
  .post("/api/v2/rpc/auth.logout", async ({ request }) => {
    const tokens = getCookies(request.headers, "auth-token");
    for (const token of tokens) {
      const payload = await verifyAuthTokenPayload(token);
      if (!payload)
        continue;

      await revokeAuthSession(payload.uid, payload.sessionId);
      writeAuditLog({ event: "logout", uid: payload.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request) });
    }
    return new Response(JSON.stringify({ success: true, message: "注销成功" }), {
      headers: normalizedClearAuthHeaders(),
    });
  }, { detail: { tags: ["RPC: Auth"] } });

function normalizedAuthHeaders(token: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  normalizeAuthCookies(token).forEach(cookie => headers.append("Set-Cookie", cookie));
  return headers;
}

function normalizedClearAuthHeaders() {
  const headers = new Headers({ "Content-Type": "application/json" });
  clearAuthCookies().forEach(cookie => headers.append("Set-Cookie", cookie));
  return headers;
}

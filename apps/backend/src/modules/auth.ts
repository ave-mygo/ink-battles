import { Elysia } from "elysia";
import { canReviewExcellentSentences, getCookie, getCurrentUser, isAdminUser, isHonoraryWriterUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { createAuthSession, revokeAuthSession } from "../utils/auth-sessions";
import { authCookie, clearAuthCookie, gravatarUrl, signAuthToken, verifyAuthTokenPayload } from "../utils/crypto";
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
    const user = await getCurrentUser(request.headers);
    const safe = safeUser(user as Record<string, unknown> | null);
    if (!safe)
      return { success: false, message: "未登录", data: null };
    const avatar = user?.avatar || (user?.email ? gravatarUrl(user.email, user.uid) : gravatarUrl("", user!.uid));
    return {
      success: true,
      data: {
        ...safe,
        avatar,
        isAdmin: isAdminUser(user),
        isHonoraryWriter: await isHonoraryWriterUser(user),
        canReviewExcellentSentences: await canReviewExcellentSentences(user),
      },
    };
  }, { detail: { tags: ["REST: Auth"] } })
  .post("/api/v2/rpc/auth.logout", async ({ request }) => {
    const token = getCookie(request.headers, "auth-token");
    const payload = await verifyAuthTokenPayload(token);
    if (payload) {
      await revokeAuthSession(payload.uid, payload.sessionId);
      writeAuditLog({ event: "logout", uid: payload.uid, ip: getRequestIp(request), userAgent: getRequestUserAgent(request) });
    }
    return new Response(JSON.stringify({ success: true, message: "注销成功" }), {
      headers: { "Content-Type": "application/json", "Set-Cookie": clearAuthCookie() },
    });
  }, { detail: { tags: ["RPC: Auth"] } });

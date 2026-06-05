import type { AuthUser } from "@ink-battles/shared/types/users/user";
import { constants, createHash, generateKeyPairSync, privateDecrypt, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Elysia, t } from "elysia";
import { COLLECTIONS, findMany, findOne, findOneAndUpdate, insertOne, updateOne } from "../db/mongo";
import { createUser, generateNextUID, getUserByEmail } from "../db/repositories";
import { canReviewExcellentSentences, getCookie, getCurrentUser, isAdminUser, isHonoraryWriterUser } from "../middleware/auth";
import { writeAuditLog } from "../utils/audit";
import { createAuthSession, revokeAuthSession, revokeUserSessions } from "../utils/auth-sessions";
import { authCookie, clearAuthCookie, gravatarUrl, signAuthToken, verifyAuthTokenPayload } from "../utils/crypto";
import { consumeEmailCode, normalizeVerificationType, sendEmailCode } from "../utils/email-codes";
import { getRequestIp, getRequestUserAgent } from "../utils/request";
import { safeUser } from "../utils/response";
import { EMAIL_REGEX, isPasswordValid, normalizeEmail } from "../utils/validators";
import { initializeUserBilling } from "./billing";
import { getSiteSettingValue } from "./site-settings";

const MINIMUM_PASSWORD_MESSAGE = "密码不符合要求。密码必须：至少10位字符、包含任意 3 种字符类型";
const RESET_SESSION_TTL_MS = 10 * 60 * 1000;
const PASSWORD_KEY_PAIR = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const PASSWORD_PUBLIC_KEY_ID = createHash("sha256").update(PASSWORD_KEY_PAIR.publicKey).digest("hex");

/**
 * 延迟指定毫秒数
 * @param milliseconds - 延迟的毫秒数
 * @returns 延迟结束的 Promise
 */
const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

/**
 * 解密登录请求中的密码密文。
 *
 * 前端只提交 RSA-OAEP 密文，后端解密后继续使用数据库中的 bcrypt hash 校验。
 */
function decryptLoginPassword(encryptedPassword: string, keyId: string): string | null {
  if (keyId !== PASSWORD_PUBLIC_KEY_ID)
    return null;
  try {
    return privateDecrypt({
      key: PASSWORD_KEY_PAIR.privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    }, Buffer.from(encryptedPassword, "base64")).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * 创建密码重置会话
 * 生成一次性会话记录，存储验证码哈希和过期时间
 * @param email - 用户邮箱
 * @param code - 邮箱验证码
 */
async function createPasswordResetSession(email: string, code: string) {
  const now = new Date();
  await insertOne(COLLECTIONS.sessions, {
    session: `password-reset:${randomUUID()}`,
    type: "password-reset",
    email,
    codeHash: await bcrypt.hash(code, 10),
    createdAt: now,
    expiresAt: new Date(now.getTime() + RESET_SESSION_TTL_MS),
    used: false,
  });
}

/**
 * 消费密码重置会话
 * 验证验证码并标记会话为已使用
 * @param email - 用户邮箱
 * @param code - 邮箱验证码
 * @returns 是否成功消费会话
 */
async function consumePasswordResetSession(email: string, code: string) {
  const now = new Date();
  const sessions = await findMany(COLLECTIONS.sessions, {
    type: "password-reset",
    email,
    used: false,
    expiresAt: { $gt: now },
  });
  for (const session of sessions) {
    if (!await bcrypt.compare(code, session.codeHash as string))
      continue;
    const consumed = await findOneAndUpdate(COLLECTIONS.sessions, {
      _id: session._id,
      used: false,
      expiresAt: { $gt: now },
    }, {
      $set: {
        used: true,
        usedAt: now,
      },
    }, { returnDocument: "before" });
    return !!consumed;
  }
  return false;
}

/**
 * 验证邀请码的有效性
 * 检查是否需要邀请码、邀请码是否存在且未使用
 * @param inviteCode - 邀请码字符串
 * @returns 验证结果，包含成功标志和邀请码记录
 */
async function validateInvite(inviteCode?: string) {
  const registrationPolicy = await getSiteSettingValue("registration.policy");
  if (!registrationPolicy.invite_code_required)
    return { success: true };
  if (!inviteCode)
    return { success: false, message: "当前注册需要邀请码", needInviteCode: true };
  const invite = await findOne(COLLECTIONS.inviteCodes, { code: inviteCode.trim().toUpperCase() });
  if (!invite || invite.used)
    return { success: false, message: "邀请码无效或已使用", needInviteCode: true };
  return { success: true, invite };
}

/**
 * 创建邮箱注册的用户
 * 分配 UID、加密密码、初始化账户与计费记录
 * @param email - 用户邮箱
 * @param password - 原始密码
 * @returns 新用户的 UID
 */
export async function createEmailUser(email: string, password: string) {
  const uid = await generateNextUID();
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 10);
  await createUser({ uid, email, passwordHash, loginMethod: "email", isActive: true, createdAt: now, updatedAt: now });
  await initializeUserBilling(uid);
  return uid;
}

/**
 * 签发登录响应
 * 创建认证会话、生成 JWT 令牌并设置 Cookie
 * @param uid - 用户 ID
 * @param data - 附加到响应中的数据
 * @param request - HTTP 请求对象，用于记录 User-Agent
 * @returns 包含认证 Cookie 的 HTTP 响应
 */
export async function issueLoginResponse(uid: number, data: Record<string, unknown> = {}, request?: Request) {
  const session = await createAuthSession(uid, { userAgent: request ? getRequestUserAgent(request) : null });
  const token = await signAuthToken(uid, session.sessionId);
  return new Response(JSON.stringify({ success: true, message: "登录成功", ...data }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": authCookie(token) },
  });
}

export const authModule = new Elysia()
  .get("/api/v2/auth/password-key", () => ({
    keyId: PASSWORD_PUBLIC_KEY_ID,
    algorithm: "RSA-OAEP-256",
    publicKey: PASSWORD_KEY_PAIR.publicKey,
  }), { detail: { tags: ["REST: Auth"] } })
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
  .post("/api/v2/rpc/auth.login", async ({ request, body }) => {
    const email = normalizeEmail(body.email);
    const password = decryptLoginPassword(body.encryptedPassword, body.keyId) ?? "";
    if (!email || !password) {
      writeAuditLog({ event: "login_failed", email, ip: getRequestIp(request), userAgent: getRequestUserAgent(request) });
      return { success: false, message: "邮箱或密码错误" };
    }
    const user = await getUserByEmail(email);
    if (!user?.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
      writeAuditLog({ event: "login_failed", email, ip: getRequestIp(request), userAgent: getRequestUserAgent(request) });
      return { success: false, message: "邮箱或密码错误" };
    }
    writeAuditLog({ event: "login_success", uid: user.uid, email, ip: getRequestIp(request), userAgent: getRequestUserAgent(request) });
    return issueLoginResponse(user.uid, {}, request);
  }, { body: t.Object({ email: t.String(), encryptedPassword: t.String(), keyId: t.String() }), detail: { tags: ["RPC: Auth"] } })
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
  }, { detail: { tags: ["RPC: Auth"] } })
  .post("/api/v2/rpc/auth.sendVerificationCode", async ({ body }) => sendEmailCode(normalizeEmail(body.email), normalizeVerificationType(body.type)), {
    body: t.Object({
      email: t.String(),
      type: t.Optional(t.String({ enum: ["register", "login", "reset-password"] })),
    }),
    detail: { tags: ["RPC: Auth"] },
  })
  .post("/api/v2/rpc/auth.register", async ({ body }) => {
    const email = normalizeEmail(body.email);
    if (!email || !body.password || !body.code)
      return { success: false, message: "邮箱、密码和验证码不能为空" };
    if (!isPasswordValid(body.password))
      return { success: false, message: MINIMUM_PASSWORD_MESSAGE };
    if (await getUserByEmail(email))
      return { success: false, message: "该邮箱已注册" };
    const invite = await validateInvite(body.inviteCode);
    if (!invite.success)
      return invite;
    const verify = await consumeEmailCode(email, body.code, "register");
    if (!verify.success)
      return verify;
    const uid = await createEmailUser(email, body.password);
    if (invite.invite)
      await updateOne(COLLECTIONS.inviteCodes, { _id: invite.invite._id }, { used: true, usedBy: uid, usedAt: new Date() });
    return { success: true, message: "注册成功，请登录" };
  }, { body: t.Object({ email: t.String(), password: t.String(), code: t.String(), inviteCode: t.Optional(t.String()) }), detail: { tags: ["RPC: Auth"] } })
  .post("/api/v2/rpc/auth.sendPasswordResetCode", async ({ body }) => {
    const email = normalizeEmail(body.email);
    if (!email || !EMAIL_REGEX.test(email))
      return { success: false, message: "请输入有效的邮箱地址" };
    const [user] = await Promise.all([
      getUserByEmail(email),
      sleep(300),
    ]);
    if (user)
      await sendEmailCode(email, "reset-password");
    return { success: true, message: "如果该邮箱已注册，您将收到重置密码的验证码" };
  }, { body: t.Object({ email: t.String() }), detail: { tags: ["RPC: Auth"] } })
  .post("/api/v2/rpc/auth.verifyPasswordResetCode", async ({ body }) => {
    const email = normalizeEmail(body.email);
    const verify = await consumeEmailCode(email, body.code, "reset-password");
    if (verify.success)
      await createPasswordResetSession(email, body.code);
    return verify;
  }, {
    body: t.Object({ email: t.String(), code: t.String() }),
    detail: { tags: ["RPC: Auth"] },
  })
  .post("/api/v2/rpc/auth.resetPassword", async ({ body }) => {
    const email = normalizeEmail(body.email);
    if (!await consumePasswordResetSession(email, body.code))
      return { success: false, message: "验证码无效或已过期" };
    if (!isPasswordValid(body.password))
      return { success: false, message: MINIMUM_PASSWORD_MESSAGE };
    await updateOne<AuthUser>(COLLECTIONS.users, { email }, { passwordHash: await bcrypt.hash(body.password, 10), updatedAt: new Date() });
    const user = await getUserByEmail(email);
    if (user) {
      await revokeUserSessions(user.uid);
      writeAuditLog({ event: "password_reset", uid: user.uid, email });
    }
    return { success: true, message: "密码重置成功" };
  }, { body: t.Object({ email: t.String(), code: t.String(), password: t.String() }), detail: { tags: ["RPC: Auth"] } });

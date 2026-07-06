import { randomUUID } from "node:crypto";
import { COLLECTIONS, findOne, insertOne, updateMany, updateOne } from "../db/mongo";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthSession {
  sessionId: string;
  uid: number;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string | null;
  ipHash?: string | null;
}

/**
 * 创建认证会话
 * @param uid - 用户ID
 * @param input - 会话输入参数，包含用户代理等信息
 * @returns 创建的认证会话对象
 */
export async function createAuthSession(uid: number, input: { userAgent?: string | null } = {}) {
  const now = new Date();
  const session: AuthSession = {
    sessionId: randomUUID(),
    uid,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    userAgent: input.userAgent ?? null,
  };
  await insertOne<AuthSession>(COLLECTIONS.authSessions, session);
  return session;
}

/**
 * 检查认证会话是否有效
 * @param uid - 用户ID
 * @param sessionId - 会话ID
 * @returns 会话是否有效
 */
export async function isAuthSessionValid(uid: number, sessionId: string) {
  const session = await findOne<AuthSession>(COLLECTIONS.authSessions, {
    uid,
    sessionId,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  return !!session;
}

/**
 * 撤销指定的认证会话
 * @param uid - 用户ID
 * @param sessionId - 会话ID
 * @returns 更新操作的结果
 */
export function revokeAuthSession(uid: number, sessionId: string) {
  return updateOne<AuthSession>(COLLECTIONS.authSessions, {
    uid,
    sessionId,
    revokedAt: { $exists: false },
  }, {
    $set: {
      revokedAt: new Date(),
    },
  });
}

/**
 * 撤销用户的所有认证会话
 * @param uid - 用户ID
 * @returns 批量更新操作的结果
 */
export function revokeUserSessions(uid: number) {
  return updateMany<AuthSession>(COLLECTIONS.authSessions, {
    uid,
    revokedAt: { $exists: false },
  }, {
    $set: {
      revokedAt: new Date(),
    },
  });
}

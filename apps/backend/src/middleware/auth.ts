import type { AuthUser } from "@ink-battles/shared/types/users/user";
import { isConfiguredAdminUid } from "../config";
import { COLLECTIONS, findOne } from "../db/mongo";
import { verifyAuthToken } from "../utils/crypto";

const BEARER_PREFIX_REGEX = /^Bearer\s+/i;

/**
 * 从请求头中获取指定名称的 Cookie 值
 * @param headers - 请求头对象
 * @param name - Cookie 名称
 * @returns Cookie 值，如果不存在则返回 undefined
 */
export function getCookie(headers: Headers, name: string) {
  const cookie = headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * 从请求头中获取当前登录用户信息
 * @param headers - 请求头对象
 * @returns 用户信息对象，如果未登录则返回 null
 */
export async function getCurrentUser(headers: Headers): Promise<AuthUser | null> {
  const token = getCookie(headers, "auth-token") ?? headers.get("authorization")?.replace(BEARER_PREFIX_REGEX, "");
  const uid = await verifyAuthToken(token);
  if (!uid)
    return null;
  return findOne<AuthUser>(COLLECTIONS.users, { uid });
}

/**
 * 要求用户必须登录，否则抛出 UNAUTHORIZED 错误
 * @param headers - 请求头对象
 * @returns 当前登录的用户信息
 * @throws 如果用户未登录则抛出 UNAUTHORIZED 错误
 */
export async function requireUser(headers: Headers) {
  const user = await getCurrentUser(headers);
  if (!user)
    throw new Error("UNAUTHORIZED");
  return user;
}

/**
 * 判断用户是否具备后台管理员权限。
 *
 * 当前权限统一走配置层，便于后续扩展为数据库角色或后台授权模式。
 */
export function isAdminUser(user: Pick<AuthUser, "uid"> | null | undefined) {
  return typeof user?.uid === "number" && isConfiguredAdminUid(user.uid);
}

/**
 * 判断用户是否为荣誉作家。
 *
 * 荣誉作家只授予内容运营权限，不继承站点配置等系统级管理能力。
 */
export async function isHonoraryWriterUser(user: Pick<AuthUser, "uid"> | null | undefined) {
  if (typeof user?.uid !== "number")
    return false;

  const setting = await findOne<Record<string, unknown>>(COLLECTIONS.siteSettings, { key: "content.honoraryWriters" });
  const value = setting?.value as { uids?: unknown[] } | undefined;
  return Array.isArray(value?.uids) && value.uids.some(uid => Number(uid) === user.uid);
}

/**
 * 判断用户是否可以审核亮点句子。
 */
export async function canReviewExcellentSentences(user: Pick<AuthUser, "uid"> | null | undefined) {
  return isAdminUser(user) || await isHonoraryWriterUser(user);
}

/**
 * 要求用户必须为管理员，否则抛出 FORBIDDEN 错误。
 */
export async function requireAdmin(headers: Headers) {
  const user = await requireUser(headers);
  if (!isAdminUser(user))
    throw new Error("FORBIDDEN");
  return user;
}

/**
 * 要求用户具备亮点句子审核权限，否则抛出 FORBIDDEN 错误。
 */
export async function requireExcellentSentenceReviewer(headers: Headers) {
  const user = await requireUser(headers);
  if (!await canReviewExcellentSentences(user))
    throw new Error("FORBIDDEN");
  return user;
}

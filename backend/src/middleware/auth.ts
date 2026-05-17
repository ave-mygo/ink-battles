import type { AuthUser } from "@ink-battles/shared/types/users/user";
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

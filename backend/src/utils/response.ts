import type { SafeUser } from "@ink-battles/shared/types/users/user";

/**
 * 构造成功响应对象
 * @param data - 响应数据
 * @param message - 响应消息
 * @returns 成功响应对象
 */
export const ok = <T>(data?: T, message?: string) => ({ success: true, data, message });

/**
 * 构造失败响应对象
 * @param message - 错误消息
 * @param status - HTTP 状态码，默认为 400
 * @returns 失败响应
 */
export const fail = (message: string, status = 400) => Response.json({ success: false, message }, { status });

/**
 * 序列化日期值为 ISO 字符串
 * @param value - 待序列化的值
 * @returns ISO 格式字符串，空值返回 null
 */
export const serializeDate = (value: unknown) => value ? new Date(value as string | Date).toISOString() : null;

/**
 * 将原始用户对象转换为安全的用户对象，过滤敏感字段
 * @param user - 原始用户记录对象
 * @returns 安全的用户对象，用户为空时返回 null
 */
export function safeUser(user: Record<string, unknown> | null): SafeUser | null {
  if (!user)
    return null;
  return {
    uid: user.uid as number,
    email: user.email as string | null | undefined,
    qqOpenid: user.qqOpenid as string | null | undefined,
    afdId: user.afdId as string | null | undefined,
    nickname: user.nickname as string | null | undefined,
    bio: user.bio as string | null | undefined,
    avatar: user.avatar as string | null | undefined,
    loginMethod: user.loginMethod as SafeUser["loginMethod"],
    isActive: user.isActive as boolean | undefined,
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt),
  };
}

/**
 * 构造带状态和消息的重定向响应
 * @param path - 重定向路径
 * @param status - 状态标识
 * @param message - 消息内容
 * @param baseUrl - 基础 URL
 * @returns 重定向响应
 */
export function redirectWithMessage(path: string, status: string, message: string, baseUrl: string) {
  const url = new URL(path, baseUrl);
  url.searchParams.set("status", status);
  url.searchParams.set("msg", message);
  return Response.redirect(url, 302);
}

import process from "node:process";
import { jwtVerify, SignJWT } from "jose";
import md5 from "md5";
import { getConfig } from "../config";
import { isAuthSessionValid } from "./auth-sessions";

const sevenDays = 7 * 24 * 60 * 60;

/**
 * 获取 JWT 密钥的编码形式
 * @returns 编码后的 JWT 密钥
 */
const jwtSecret = () => new TextEncoder().encode(getConfig().jwt.secret);

export interface AuthTokenPayload {
	uid: number;
	sessionId: string;
}

/**
 * 签发认证令牌
 * @param uid - 用户ID
 * @param sessionId - 会话ID
 * @returns JWT 认证令牌字符串
 */
export const signAuthToken = async (uid: number, sessionId: string) =>
	new SignJWT({ uid, sessionId })
		.setProtectedHeader({ alg: "HS256" })
		.setExpirationTime("7d")
		.sign(jwtSecret());

/**
 * 验证认证令牌并返回完整的载荷信息
 * @param token - JWT 认证令牌
 * @returns 认证令牌载荷对象，验证失败返回 null
 */
export const verifyAuthTokenPayload = async (token?: string | null): Promise<AuthTokenPayload | null> => {
	if (!token)
		return null;
	try {
		const { payload } = await jwtVerify(token, jwtSecret());
		if (typeof payload.uid !== "number" || typeof payload.sessionId !== "string")
			return null;
		if (!await isAuthSessionValid(payload.uid, payload.sessionId))
			return null;
		return { uid: payload.uid, sessionId: payload.sessionId };
	} catch {
		return null;
	}
};

/**
 * 验证认证令牌并返回用户ID
 * @param token - JWT 认证令牌
 * @returns 用户ID，验证失败返回 null
 */
export const verifyAuthToken = async (token?: string | null): Promise<number | null> =>
	(await verifyAuthTokenPayload(token))?.uid ?? null;

/**
 * 生成认证 Cookie 字符串
 * @param token - JWT 认证令牌
 * @returns Cookie 字符串
 */
export const authCookie = (token: string) =>
	`auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sevenDays}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`;

/**
 * 生成清除认证 Cookie 的字符串
 * @returns 清除 Cookie 的字符串
 */
export const clearAuthCookie = () => "auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

/**
 * 生成用户头像 URL
 * @param email - 用户邮箱
 * @param uid - 用户ID
 * @returns 头像 URL，优先使用 Gravatar，否则使用 DiceBear
 */
export const gravatarUrl = (email: string, uid: number) =>
	email ? `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=mp` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

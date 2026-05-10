import { getAppOrigin, getServerConfig } from "../config";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const serverConfig = getServerConfig();
const appOrigin = getAppOrigin();

/**
 * 检查请求来源是否在允许列表中
 * @param origin - 请求来源
 * @returns 如果来源被允许则返回 true，否则返回 false
 */
const allowedOrigin = (origin: string) =>
	serverConfig.allowed_origins.includes(origin) || origin === appOrigin;

/**
 * 从 Referer 头中提取来源
 * @param referer - Referer 请求头值
 * @returns 解析得到的来源字符串，解析失败时返回 null
 */
const originFromReferer = (referer: string | null) => {
	if (!referer)
		return null;
	try {
		return new URL(referer).origin;
	} catch {
		return null;
	}
};

/**
 * 验证请求来源是否合法，防止 CSRF 攻击
 * @param request - 请求对象
 * @throws 如果请求来源不合法则抛出 INVALID_ORIGIN 错误
 */
export const assertOrigin = (request: Request) => {
	if (!unsafeMethods.has(request.method))
		return;
	const origin = request.headers.get("origin");
	if (origin && allowedOrigin(origin))
		return;
	if (!origin && allowedOrigin(originFromReferer(request.headers.get("referer")) ?? ""))
		return;
	if (!origin || !allowedOrigin(origin)) {
		throw new Error("INVALID_ORIGIN");
	}
};

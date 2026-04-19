import process from "node:process";

const DEFAULT_LOCAL_APP_BASE_URL = "http://localhost:3001";

/**
 * 解析 OAuth 浏览器重定向使用的公开应用地址。
 *
 * APP_BASE_URL 对应后端 config.toml 中的 app.base_url，必须优先于当前请求 origin，
 * 避免第三方 OAuth 回调落到 localhost 或其他临时前端地址。
 */
export const getOAuthAppBaseUrl = () =>
	process.env.APP_BASE_URL
	|| process.env.NEXT_PUBLIC_SITE_URL
	|| DEFAULT_LOCAL_APP_BASE_URL;

/**
 * 创建指向后端 OAuth RPC 的公开回调地址，并保留 OAuth provider 回传的查询参数。
 */
export const createOAuthCallbackUrl = (requestUrl: string, callbackPath: string) => {
	const sourceUrl = new URL(requestUrl);
	const callbackUrl = new URL(callbackPath, getOAuthAppBaseUrl());
	callbackUrl.search = sourceUrl.search;
	return callbackUrl;
};

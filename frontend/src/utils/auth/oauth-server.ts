/**
 * 创建同源后端 OAuth RPC 地址，并保留 OAuth provider 回传的查询参数。
 */
export const createOAuthCallbackUrl = (requestUrl: string, callbackPath: string) => {
	const callbackUrl = new URL(requestUrl);
	callbackUrl.pathname = callbackPath;
	return callbackUrl;
};

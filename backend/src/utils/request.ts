const FORWARDED_FOR_SEPARATOR = ",";

/**
 * 获取请求的客户端 IP 地址
 * @param request - HTTP 请求对象
 * @returns 客户端 IP 地址，未找到返回 null
 */
export const getRequestIp = (request: Request) => {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor)
		return forwardedFor.split(FORWARDED_FOR_SEPARATOR)[0]?.trim() || null;
	return request.headers.get("x-real-ip") || null;
};

/**
 * 获取请求的用户代理字符串
 * @param request - HTTP 请求对象
 * @returns 用户代理字符串
 */
export const getRequestUserAgent = (request: Request) =>
	request.headers.get("user-agent");

import { env } from "../env";

const hopByHopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
const upstreamCompressionHeaders = new Set(["accept-encoding"]);
const decodedResponseHeaders = new Set(["content-encoding", "content-length"]);

const copyHeaders = (headers: Headers): Headers => {
	const nextHeaders = new Headers(headers);
	hopByHopHeaders.forEach(header => nextHeaders.delete(header));
	return nextHeaders;
};

/**
 * 构造转发给 Next.js 上游的请求头。
 *
 * Bun fetch 会在暴露响应流前解码上游压缩体，所以不能把浏览器的
 * Accept-Encoding 原样转给上游，否则代理后可能出现已解码 body 配旧
 * Content-Encoding 的响应。
 */
const createFrontendRequestHeaders = (headers: Headers): Headers => {
	const nextHeaders = copyHeaders(headers);
	upstreamCompressionHeaders.forEach(header => nextHeaders.delete(header));
	nextHeaders.set("accept-encoding", "identity");
	return nextHeaders;
};

/**
 * 构造代理体归一化后的响应头。
 *
 * fetch 解码或转换 body stream 后，上游编码态 payload 的实体头不再可靠。
 */
const createFrontendResponseHeaders = (headers: Headers): Headers => {
	const nextHeaders = copyHeaders(headers);
	decodedResponseHeaders.forEach(header => nextHeaders.delete(header));
	return nextHeaders;
};

export const proxyToFrontend = async (request: Request): Promise<Response> => {
	const sourceUrl = new URL(request.url);
	const targetUrl = new URL(`${sourceUrl.pathname}${sourceUrl.search}`, env.frontendOrigin);
	const method = request.method;
	const hasBody = !["GET", "HEAD"].includes(method);

	const response = await fetch(targetUrl, {
		method,
		headers: createFrontendRequestHeaders(request.headers),
		body: hasBody ? request.body : undefined,
		redirect: "manual",
	});

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: createFrontendResponseHeaders(response.headers),
	});
};

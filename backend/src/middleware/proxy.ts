import { env } from "../env";

const hopByHopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);

const copyHeaders = (headers: Headers) => {
	const nextHeaders = new Headers(headers);
	hopByHopHeaders.forEach(header => nextHeaders.delete(header));
	return nextHeaders;
};

export const proxyToFrontend = async (request: Request) => {
	const sourceUrl = new URL(request.url);
	const targetUrl = new URL(`${sourceUrl.pathname}${sourceUrl.search}`, env.frontendOrigin);
	const method = request.method;
	const hasBody = !["GET", "HEAD"].includes(method);

	const response = await fetch(targetUrl, {
		method,
		headers: copyHeaders(request.headers),
		body: hasBody ? request.body : undefined,
		redirect: "manual",
	});

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: copyHeaders(response.headers),
	});
};

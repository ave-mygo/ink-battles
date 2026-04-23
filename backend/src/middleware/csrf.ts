import { getAppOrigin, getServerConfig } from "../config";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const serverConfig = getServerConfig();
const appOrigin = getAppOrigin();

const allowedOrigin = (origin: string) =>
	serverConfig.allowed_origins.includes(origin) || origin === appOrigin;

const originFromReferer = (referer: string | null) => {
	if (!referer)
		return null;
	try {
		return new URL(referer).origin;
	} catch {
		return null;
	}
};

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

import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { getAppOrigin, getServerConfig } from "./config";
import { ensureBackendIndexes } from "./db/indexes";
import { env } from "./env";
import { assertOrigin } from "./middleware/csrf";
import { mapError } from "./middleware/errors";
import { proxyToFrontend } from "./middleware/proxy";
import { assertRateLimit } from "./middleware/rate-limit";
import { accountsModule } from "./modules/accounts";
import { analysisModule } from "./modules/analysis";
import { authModule } from "./modules/auth";
import { billingModule } from "./modules/billing";
import { dashboardModule } from "./modules/dashboard";
import { oauthModule } from "./modules/oauth";
import { publicModule } from "./modules/public";
import { statusModule } from "./modules/status";
import { recoverInterruptedAnalysisTasks } from "./modules/analysis-worker";

/**
 * 判断请求路径是否需要代理到前端
 * @param path - 请求路径
 * @returns 是否需要代理（非 /api/v2 开头的路径需要代理）
 */
const shouldProxy = (path: string) => !path.startsWith("/api/v2");
const methodsWithBody = new Set(["POST", "PUT", "PATCH"]);
const serverConfig = getServerConfig();
const appOrigin = getAppOrigin();

/**
 * 断言请求体大小不超过配置的最大值
 * @param request - HTTP 请求对象
 * @throws 如果请求体过大则抛出 PAYLOAD_TOO_LARGE 错误
 */
const assertRequestBodySize = (request: Request) => {
	if (!methodsWithBody.has(request.method))
		return;

	const contentLength = Number(request.headers.get("content-length") || 0);
	if (Number.isFinite(contentLength) && contentLength > serverConfig.max_json_body_bytes)
		throw new Error("PAYLOAD_TOO_LARGE");
};

/**
 * 创建类型化的 Elysia 应用实例
 * 配置 CORS、OpenAPI、请求拦截、错误处理及所有业务模块路由
 * @returns Elysia 应用实例
 */
const createTypedApp = () =>
	new Elysia()
		.use(cors({
			origin: ({ headers }) => {
				const origin = headers.get("origin");
				return !origin || serverConfig.allowed_origins.includes(origin) || origin === appOrigin;
			},
			credentials: true,
		}))
		.use(openapi({ path: "/api/v2/openapi" }))
		.onRequest(async ({ request }) => {
			console.log(`${request.method} ${new URL(request.url).pathname}`);
			assertRequestBodySize(request);
			assertOrigin(request);
			await assertRateLimit(request);
		})
		.onError(({ error }) => mapError(error))
		.use(publicModule)
		.use(authModule)
		.use(oauthModule)
		.use(analysisModule)
		.use(billingModule)
		.use(accountsModule)
		.use(dashboardModule)
		.use(statusModule)
		.all("/*", ({ request }) => shouldProxy(new URL(request.url).pathname) ? proxyToFrontend(request) : Response.json({ success: false, message: "Not found" }, { status: 404 }));

export type App = ReturnType<typeof createTypedApp>;

/**
 * 创建并初始化应用实例
 * 包括确保数据库索引、恢复中断的分析任务等启动流程
 * @returns 完整配置的 Elysia 应用实例
 */
export const createApp = async () => {
	await ensureBackendIndexes();
	const recoveredTasks = await recoverInterruptedAnalysisTasks();
	if (recoveredTasks > 0)
		console.warn(`[analysis] recovered ${recoveredTasks} interrupted tasks`);

	return createTypedApp();
};

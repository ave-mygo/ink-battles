import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
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

const shouldProxy = (path: string) => !path.startsWith("/api/v2");

const createTypedApp = () =>
	new Elysia()
		.use(cors({
			origin: ({ headers }) => {
				const origin = headers.get("origin");
				return !origin || env.allowedOrigins.includes(origin) || origin === env.appBaseUrl;
			},
			credentials: true,
		}))
		.use(openapi({ path: "/api/v2/openapi" }))
		.onRequest(async ({ request }) => {
			console.log(`${request.method} ${new URL(request.url).pathname}`);
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

export const createApp = async () => {
	await ensureBackendIndexes();

	return createTypedApp();
};

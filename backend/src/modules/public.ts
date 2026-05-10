import { Elysia } from "elysia";
import { getPublicConfig } from "../config";
import { queryAfdianSponsors } from "../integrations/afdian";

/**
 * 公共模块
 * 提供无需鉴权即可访问的公共接口，包括公开配置、赞助者列表和健康检查
 */
export const publicModule = new Elysia()
	.get("/api/v2/config/public", () => getPublicConfig(), { detail: { tags: ["REST: Public"] } })
	.get("/api/v2/sponsors", async ({ query }) => queryAfdianSponsors(Number(query.page ?? 1)), { detail: { tags: ["REST: Public"] } })
	.get("/api/v2/health", () => ({ success: true, status: "ok", service: "ink-battles-backend" }), { detail: { tags: ["REST: Public"] } });

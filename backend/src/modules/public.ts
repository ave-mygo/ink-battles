import { Elysia } from "elysia";
import { getPublicConfig } from "../config";
import { queryAfdianSponsors } from "../integrations/afdian";

export const publicModule = new Elysia()
	.get("/api/v2/config/public", () => getPublicConfig(), { detail: { tags: ["REST: Public"] } })
	.get("/api/v2/sponsors", async ({ query }) => queryAfdianSponsors(Number(query.page ?? 1)), { detail: { tags: ["REST: Public"] } })
	.get("/api/v2/health", () => ({ success: true, status: "ok", service: "ink-battles-backend" }), { detail: { tags: ["REST: Public"] } });

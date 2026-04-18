import { Elysia } from "elysia";
import { getExternalStatus } from "../integrations/external-status";

export const statusModule = new Elysia()
	.get("/api/v2/status", async ({ query }) => getExternalStatus(Number(query.page ?? 1), Number(query.pageSize ?? 20)), {
		detail: { tags: ["REST: Status"] },
	});

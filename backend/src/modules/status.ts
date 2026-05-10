import { Elysia } from "elysia";
import { getExternalStatus } from "../integrations/external-status";

/**
 * 状态监控模块
 * 提供外部服务状态查询的 REST API 接口，支持分页查询
 */
export const statusModule = new Elysia()
	.get("/api/v2/status", async ({ query }) => {
		const page = Math.max(Number(query.page ?? 1), 1);
		const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);
		return getExternalStatus(page, pageSize);
	}, {
		detail: { tags: ["REST: Status"] },
	});

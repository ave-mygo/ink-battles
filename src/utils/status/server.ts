import type { StatusApiResponse } from "@/types/common/status";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

/**
 * 获取系统状态分页数据。
 *
 * 由服务端组件调用，负责把当前请求的上下文透传给后端 API。
 */
export const getStatusPage = async (page: number, pageSize: number): Promise<StatusApiResponse> =>
	normalizeEdenResult<StatusApiResponse>(
		...(await (async () => {
			const api = await createServerEden();
			const response = await api.api.v2.status.get({
				query: { page, pageSize },
			});
			return [response.data, response.error] as const;
		})()),
		"加载系统状态失败",
	);

"use client";

import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";

export type HistorySortOption = "time_desc" | "time_asc" | "score_desc" | "score_asc";
export type HistoryVisibilityOption = "all" | "public" | "private";

const HISTORY_SORT_QUERY: Record<HistorySortOption, { sortBy: "time" | "score"; sortOrder: "asc" | "desc" }> = {
	time_desc: { sortBy: "time", sortOrder: "desc" },
	time_asc: { sortBy: "time", sortOrder: "asc" },
	score_desc: { sortBy: "score", sortOrder: "desc" },
	score_asc: { sortBy: "score", sortOrder: "asc" },
};

const mapHistoryData = (data: any) => ({
	records: data.records,
	total: data.pagination?.total ?? data.total ?? 0,
	page: data.pagination?.page ?? data.page ?? 1,
	limit: data.pagination?.limit ?? data.limit ?? 10,
	totalPages: data.pagination?.totalPages ?? data.totalPages ?? 1,
});

/**
 * 将排序选项映射为历史记录接口可识别的查询参数。
 */
export const getHistorySortQuery = (sort: HistorySortOption = "time_desc") =>
	HISTORY_SORT_QUERY[sort] ?? HISTORY_SORT_QUERY.time_desc;

export async function getUserAnalysisHistory(
	page = 1,
	limit = 10,
	sort: HistorySortOption = "time_desc",
	visibility: HistoryVisibilityOption = "all",
) {
	const sortQuery = getHistorySortQuery(sort);
	const edenResponse = await createClientEden().api.v2.analysis.history.get({
		query: { page, limit, visibility, ...sortQuery },
	});
	const response = await normalizeEdenResult<any>(edenResponse.data, edenResponse.error, "加载历史记录失败");
	return response.success ? { ...response, data: mapHistoryData(response.data) } : response;
}

export async function getAnalysisRecordById(recordId: string) {
	const edenResponse = await createClientEden().api.v2.analysis.history({ id: recordId }).get();
	const response = await normalizeEdenResult<any>(edenResponse.data, edenResponse.error, "加载记录失败");
	return response.success ? { ...response, data: response.data?.record } : response;
}

export async function getPublicAnalysisRecord(recordId: string) {
	const edenResponse = await createClientEden().api.v2.analysis.share({ id: recordId }).get();
	const response = await normalizeEdenResult<any>(edenResponse.data, edenResponse.error, "加载分享记录失败");
	return response.success ? { ...response, data: response.data?.record } : response;
}

export async function getViewableAnalysisRecord(taskId: string) {
	const edenResponse = await createClientEden().api.v2.analysis.tasks({ taskId }).get();
	const status = await normalizeEdenResult<any>(edenResponse.data, edenResponse.error, "加载任务失败");
	if (status.success && status.resultId) {
		return getAnalysisRecordById(status.resultId);
	}
	return getAnalysisRecordById(taskId);
}

export async function toggleRecordPublic(recordId: string, isPublic: boolean) {
	const response = await createClientEden().api.v2.analysis.history({ id: recordId }).patch({ isPublic });
	return normalizeEdenResult<{ success: boolean; message?: string }>(response.data, response.error, "更新公开状态失败");
}

export async function deleteAnalysisRecord(recordId: string) {
	const response = await createClientEden().api.v2.analysis.history({ id: recordId }).delete();
	return normalizeEdenResult<{ success: boolean; message?: string }>(response.data, response.error, "删除记录失败");
}

export async function getPublicRecordsForSitemap() {
	return { success: true, data: [] };
}

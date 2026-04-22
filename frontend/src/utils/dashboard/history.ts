"use client";

import type { ApiResult } from "@ink-battles/shared/types/api";
import type { HistoryPageResult, HistoryRecordResult } from "@ink-battles/shared/types/common/history";
import type { DatabaseAnalysisRecord } from "@ink-battles/shared/types/database/analysis_requests";
import type { HistorySortOption, HistoryVisibilityOption } from "./history-shared";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { mapHistoryData } from "./history-shared";

const HISTORY_SORT_QUERY: Record<HistorySortOption, { sortBy: "time" | "score"; sortOrder: "asc" | "desc" }> = {
	time_desc: { sortBy: "time", sortOrder: "desc" },
	time_asc: { sortBy: "time", sortOrder: "asc" },
	score_desc: { sortBy: "score", sortOrder: "desc" },
	score_asc: { sortBy: "score", sortOrder: "asc" },
};

export type { HistoryPageData, HistorySortOption, HistoryVisibilityOption } from "./history-shared";

/**
 * 将排序选项映射为历史记录接口可识别的查询参数。
 */
export const getHistorySortQuery = (sort: HistorySortOption = "time_desc") =>
	HISTORY_SORT_QUERY[sort] ?? HISTORY_SORT_QUERY.time_desc;

type HistoryPageDataResult = ApiResult<import("@ink-battles/shared/types/common/history").HistoryPageData>;
type HistoryRecordDataResult = ApiResult<DatabaseAnalysisRecord>;

export async function getUserAnalysisHistory(
	page = 1,
	limit = 10,
	sort: HistorySortOption = "time_desc",
	visibility: HistoryVisibilityOption = "all",
): Promise<HistoryPageDataResult> {
	const sortQuery = getHistorySortQuery(sort);
	const edenResponse = await createClientEden().api.v2.analysis.history.get({
		query: { page, limit, visibility, ...sortQuery },
	});
	const response = await normalizeEdenResult<HistoryPageResult>(edenResponse.data, edenResponse.error, "加载历史记录失败");
	if (!response.success || !response.data) {
		return {
			success: false,
			message: response.message,
			error: response.error,
		};
	}

	return {
		...response,
		data: mapHistoryData(response.data),
	};
}

export async function getAnalysisRecordById(recordId: string): Promise<HistoryRecordDataResult> {
	const edenResponse = await createClientEden().api.v2.analysis.history({ id: recordId }).get();
	const response = await normalizeEdenResult<HistoryRecordResult>(edenResponse.data, edenResponse.error, "加载记录失败");
	if (!response.success || !response.data) {
		return {
			success: false,
			message: response.message,
			error: response.error,
		};
	}

	return {
		...response,
		data: response.data.record,
	};
}

export async function getPublicAnalysisRecord(recordId: string): Promise<HistoryRecordDataResult> {
	const edenResponse = await createClientEden().api.v2.analysis.share({ id: recordId }).get();
	const response = await normalizeEdenResult<HistoryRecordResult>(edenResponse.data, edenResponse.error, "加载分享记录失败");
	if (!response.success || !response.data) {
		return {
			success: false,
			message: response.message,
			error: response.error,
		};
	}

	return {
		...response,
		data: response.data.record,
	};
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

import type { ApiResult } from "../api";
import type { DatabaseAnalysisRecord } from "../database/analysis_requests";

export type HistorySortOption = "time_desc" | "time_asc" | "score_desc" | "score_asc";
export type HistoryVisibilityOption = "all" | "public" | "private";

export interface HistoryPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface HistoryPageData {
	records: DatabaseAnalysisRecord[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface HistoryPagePayload {
	records: DatabaseAnalysisRecord[];
	pagination: HistoryPagination;
}

export type HistoryPageResult = ApiResult<HistoryPagePayload>;
export type HistoryRecordResult = ApiResult<{ record: DatabaseAnalysisRecord }>;

export interface SharedHistorySharer {
	displayName: string;
	avatarUrl: string;
	bio?: string | null;
}

export interface SharedHistoryRecordPayload {
	record: DatabaseAnalysisRecord;
	sharer?: SharedHistorySharer;
}

export type SharedHistoryRecordResult = ApiResult<SharedHistoryRecordPayload>;

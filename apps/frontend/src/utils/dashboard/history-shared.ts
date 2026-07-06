import type { HistoryPageData, HistoryPagePayload, HistorySortOption, HistoryVisibilityOption } from "@ink-battles/shared/types/common/history";

export type { HistoryPageData, HistorySortOption, HistoryVisibilityOption };

/**
 * 统一整理历史记录分页结构，避免服务端和客户端各自重复映射。
 */
export const mapHistoryData = (data: HistoryPagePayload): HistoryPageData => ({
  records: data.records,
  total: data.pagination.total,
  page: data.pagination.page,
  limit: data.pagination.limit,
  totalPages: data.pagination.totalPages,
});

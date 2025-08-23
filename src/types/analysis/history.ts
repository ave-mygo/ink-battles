import type { AnalysisFullResult } from "./result";

/**
 * 分析历史条目类型
 * 来源：analysis-history.ts
 */
export interface AnalysisHistoryItem {
	_id: string;
	timestamp: string;
	overallScore: number;
	title: string;
	ratingTag: string;
	summary: string;
	articleText: string;
	mode: string;
	tags?: string[];
}

/**
 * 分析历史响应类型
 * 来源：analysis-history.ts
 */
export interface AnalysisHistoryResponse {
	data: AnalysisHistoryItem[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

/**
 * 分析详情条目类型
 * 来源：analysis-history.ts
 */
export interface AnalysisDetailItem extends AnalysisHistoryItem {
	analysisResult: AnalysisFullResult;
}
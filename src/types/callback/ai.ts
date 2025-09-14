/**
 * 分析维度类型
 * 来源：ai.ts内部Dimension接口
 */
export interface AnalysisDimension {
	name: string;
	score: number;
	description: string;
}

/**
 * AI分析结果类型
 * 来源：ai.ts
 */
export interface AnalysisResult {
	overallScore: number;
	title: string;
	ratingTag: string;
	overallAssessment: string;
	summary: string;
	tags: string[];
	dimensions: AnalysisDimension[];
	strengths: string[];
	improvements: string[];
}

/**
 * 完整分析结果维度类型
 * 来源：analysis-history.ts
 */
export interface AnalysisFullResultDimension {
	name: string;
	score: number;
	description: string;
}

/**
 * 完整分析结果类型
 * 来源：analysis-history.ts
 */
export interface AnalysisFullResult {
	overallScore: number;
	overallAssessment: string;
	title: string;
	ratingTag: string;
	summary: string;
	tags?: string[];
	dimensions: AnalysisFullResultDimension[];
	strengths: string[];
	improvements: string[];
}

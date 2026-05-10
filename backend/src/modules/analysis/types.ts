export type SearchModel = "none" | "gemini" | "gemini-lite" | "ds-search";

export type AnalysisTaskPool = "standard" | "sponsor";

export interface AnalysisTaskOptions {
	uid: number | null;
	modelId: string;
	articleText: string;
	mode: string;
	fingerprint: string;
	searchModel: SearchModel;
	isPremium: boolean;
	pool: AnalysisTaskPool;
}

export interface AnalysisResult {
	title: string;
	ratingTag: string;
	finalTag: string;
	overallAssessment: string;
	summary: string;
	tags: string[];
	dimensions: Array<{ name: string; score: number; description?: string }>;
	strengths: unknown[];
	improvements: unknown[];
	authorMatches?: Array<{ name: string; styleLabel: string; description: string; confidence: number; reasons: string[] }>;
}

export interface AnalysisSearchContext {
	searchResults: string;
	searchWebPages?: unknown;
}


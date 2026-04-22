export interface MermaidDiagram {
	type: string;
	title: string;
	code: string;
}

export interface AnalysisDimension {
	name: string;
	score: number;
	description: string;
	originalScore?: number;
}

export interface AuthorStyleMatch {
	name: string;
	styleLabel: string;
	description: string;
	confidence: number;
	reasons: string[];
}

export interface AnalysisResult {
	overallScore: number;
	title: string;
	ratingTag: string;
	finalTag: string;
	overallAssessment: string;
	summary: string;
	tags: string[];
	dimensions: AnalysisDimension[];
	strengths: string[];
	improvements: string[];
	authorMatches?: AuthorStyleMatch[];
	mermaid_diagrams?: MermaidDiagram[];
}

export interface AnalysisInput {
	articleText: string;
	mode: string;
	search?: {
		searchResults?: string;
		searchWebPages?: Array<{ uri: string; title?: string }>;
	};
}

export interface AnalysisOutput {
	result: string;
	overallScore: number;
	tags: string[];
	modelName?: string;
}

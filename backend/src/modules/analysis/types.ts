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
  articleStyleProfile?: {
    languageHabits: string[];
    sentenceStructures: string[];
    expressionRhythm: string;
    imageryPreferences: string[];
    emotionalTendency: string;
    narrativeMode: string;
    spiritualCore: string;
    styleLabel: string;
    summary: string;
    keywords: string[];
  };
  authorMatches?: Array<{ authorId?: string; name: string; styleLabel: string; description: string; confidence: number; similarity?: number; source?: "library" | "model"; reasons: string[] }>;
  excellentSentences?: Array<{ content: string; reason: string }>;
}

export interface AnalysisSearchContext {
  searchResults: string;
  searchWebPages?: unknown;
}

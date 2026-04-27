import type { AnalysisInput, AnalysisOutput } from "../ai";

export interface DatabaseAnalysisRecord {
	_id?: string;
	uid: string | null;
	article: {
		input: AnalysisInput;
		output: AnalysisOutput;
	};
	metadata: {
		sha1: string;
		ip: string | null;
		fingerprint: string | null;
		modelName?: string;
		searchModel?: "none" | "gemini" | "gemini-lite" | "ds-search";
	};
	timestamp: string;
	settings?: {
		public: boolean;
	};
	privacy?: {
		firstViewedAt?: string;
		expiresAt?: string;
		hiddenAt?: string;
		hideReason?: "guest_expired";
	};
}

export type AnalysisTaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface DatabaseAnalysisTask {
	_id?: string;
	uid: string | null;
	status: AnalysisTaskStatus;
	input: {
		articleText: string;
		mode: string;
		modelId?: string;
		search?: {
			searchResults: string;
			searchWebPages?: string;
		};
	};
	metadata: {
		sha1: string;
		ip: string | null;
		fingerprint: string | null;
		modelName?: string;
		searchModel?: "none" | "gemini" | "gemini-lite" | "ds-search";
		session: string;
	};
	createdAt: string;
	updatedAt: string;
	billing?: {
		deducted: boolean;
		deductedFrom: "grant" | "paid" | null;
		deductedAt?: string;
		completedAt?: string;
		refunded?: boolean;
		refundedAt?: string;
		refundReason?: "failed" | "cancelled";
		refundBalanceApplied?: boolean;
	};
	error?: string;
	resultId?: string;
}

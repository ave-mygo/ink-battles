export type ExcellentSentenceAuthorizationStatus = "granted" | "revoked";
export type ExcellentSentenceReviewStatus = "pending" | "approved" | "rejected";
export type ExcellentSentenceRecommendationStatus = "none" | "recommended";

export interface DatabaseExcellentSentence {
	_id?: string;
	content: string;
	normalizedContent: string;
	sourceArticleId: string;
	uid: number;
	authorName: string;
	workName?: string | null;
	authorizationStatus: ExcellentSentenceAuthorizationStatus;
	reviewStatus: ExcellentSentenceReviewStatus;
	recommendationStatus: ExcellentSentenceRecommendationStatus;
	reviewerUid?: number | null;
	reviewedAt?: string | null;
	metadata?: {
		reason?: string;
		sourceType?: "analysis" | "custom_upload";
		tags?: string[];
	};
	createdAt: string;
	updatedAt: string;
}

export interface DatabaseSentenceVector {
	_id?: string;
	sentenceId: string;
	content: string;
	vector: number[];
	modelId: string;
	model: string;
	dimensions: number;
	status: "ready" | "failed";
	error?: string | null;
	createdAt: string;
	updatedAt: string;
}

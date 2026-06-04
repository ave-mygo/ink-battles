export type ExcellentSentenceAuthorizationStatus = "granted" | "revoked";
export type ExcellentSentenceReviewStatus = "pending" | "approved" | "rejected";
export type ExcellentSentenceRecommendationStatus = "none" | "candidate" | "recommended";
export type ExcellentSentenceDisplayStatus = "hidden" | "public";

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
	displayStatus: ExcellentSentenceDisplayStatus;
	reviewerUid?: number | null;
	reviewedAt?: string | null;
	metadata?: {
		reason?: string;
		sourceType?: "analysis" | "custom_upload";
	};
	createdAt: string;
	updatedAt: string;
}

import type { AuthorStyleFeatureProfile } from "../common/author-styles";

export interface DatabaseAuthorStyle {
	authorName: string;
	bio: string;
	representativeWorks: string[];
	representativeTexts: string[];
	styleIntro: string;
	featureProfile: AuthorStyleFeatureProfile | null;
	vectorStatus: "pending" | "ready" | "failed";
	vectorModelId?: string | null;
	vectorUpdatedAt?: string | null;
	vectorError?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DatabaseAuthorStyleVector {
	authorStyleId: string;
	vector: number[];
	modelId: string;
	model: string;
	dimensions: number;
	status: "ready" | "failed";
	error: string | null;
	createdAt: string;
	updatedAt: string;
}

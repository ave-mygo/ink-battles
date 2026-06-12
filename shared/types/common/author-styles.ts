export interface AuthorStyleFeatureProfile {
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
}

export interface AuthorStyleSetting {
	enabled: boolean;
	similarityThreshold: number;
	topK: number;
}

export interface AuthorStyleLibraryItem {
	id: string;
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

export interface AuthorStyleLibraryListResponse {
	items: AuthorStyleLibraryItem[];
	total: number;
}

export interface AuthorStyleLibrarySaveInput {
	authorName: string;
	bio?: string;
	representativeWorks?: string[];
	representativeTexts: string[];
	styleIntro?: string;
}

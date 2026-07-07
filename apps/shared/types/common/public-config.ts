import type { GradingModelConfig } from "./config";

export interface FriendLink {
	title: string;
	description: string;
	url: string;
}

export interface PublicAppNotice {
	enabled?: boolean;
	content?: string;
	link?: string;
}

export interface PublicUploadLimits {
	guestPerRequestChars?: number;
	loggedPerRequestChars?: number;
	guestDailyChars?: number;
}

export type PublicValidatorModelId = "none" | "gemini" | "gemini-lite" | "ds-search";

export interface PublicValidatorModelConfig {
	id: PublicValidatorModelId;
	name: string;
	enabled: boolean;
}

export interface PublicAppConfig {
	app_name?: string;
	notice?: PublicAppNotice;
}

export interface PublicConfigResponse {
	app?: PublicAppConfig;
	registration?: {
		invite_code_required?: boolean;
	};
	uploadLimits?: PublicUploadLimits;
	gradingModels?: GradingModelConfig[];
	validatorModels?: PublicValidatorModelConfig[];
	friends?: FriendLink[];
}

export const DEFAULT_PUBLIC_CONFIG: PublicConfigResponse = {
	app: {
		notice: {
			enabled: false,
			content: "",
			link: "",
		},
	},
	registration: {
		invite_code_required: false,
	},
	gradingModels: [],
	validatorModels: [],
	friends: [],
};

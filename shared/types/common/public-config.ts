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

export interface PublicAppConfig {
	notice?: PublicAppNotice;
}

export interface PublicConfigResponse {
	app?: PublicAppConfig;
	registration?: {
		invite_code_required?: boolean;
	};
	gradingModels?: GradingModelConfig[];
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
	friends: [],
};

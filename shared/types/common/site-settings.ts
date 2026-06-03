import type { FriendLink, PublicAppNotice, PublicUploadLimits } from "./public-config";
import type { GradingModelConfig } from "./config";

export type SiteSettingKey
	= | "site.notice"
		| "site.friends"
		| "registration.policy"
		| "content.uploadLimits"
		| "analysis.runtime"
		| "analysis.scoringPolicy"
		| "ai.generation"
		| "ai.gradingModels";

export type SiteSettingSource = "config" | "database";

export interface RegistrationPolicySetting {
	invite_code_required: boolean;
}

export interface AnalysisRuntimeSetting {
	max_article_chars: number;
	max_output_chars: number;
	max_concurrent_tasks: number;
	max_queued_tasks: number;
	max_sponsor_queued_tasks: number;
	max_active_tasks_per_user: number;
	max_mode_chars: number;
	max_fingerprint_chars: number;
	guest_result_ttl_minutes: number;
	task_timeout_ms: number;
	stream_max_chunks: number;
	validation_max_text_chars: number;
	excellent_sentences_max_count: number;
}

export interface AnalysisScoringPolicySetting {
	enable_low_score_compensation: boolean;
	compensation_score_floor: number;
	compensation_min_count_above_3_5: number;
	compensation_min_count_above_4_0: number;
}

export interface AiGenerationSetting {
	default_temperature: number;
	gpt5_nano_temperature: number;
	enable_seed: boolean;
	enable_json_mode_when_supported: boolean;
}

export type GradingModelAdminConfig = GradingModelConfig & {
	enabled: boolean;
	model: string;
	supports_json_mode?: boolean;
};

export interface SiteSettingValueMap {
	"site.notice": PublicAppNotice;
	"site.friends": FriendLink[];
	"registration.policy": RegistrationPolicySetting;
	"content.uploadLimits": PublicUploadLimits;
	"analysis.runtime": AnalysisRuntimeSetting;
	"analysis.scoringPolicy": AnalysisScoringPolicySetting;
	"ai.generation": AiGenerationSetting;
	"ai.gradingModels": GradingModelAdminConfig[];
}

export interface SiteSettingMeta {
	key: SiteSettingKey;
	label: string;
	description: string;
	category: "content" | "registration" | "limits";
	value: SiteSettingValueMap[SiteSettingKey];
	source: SiteSettingSource;
	updatedAt: string | null;
	updatedByUid: number | null;
	updatedByLabel: string | null;
}

export interface SiteSettingHistoryItem {
	id: string;
	key: SiteSettingKey;
	adminUid: number;
	adminLabel: string;
	before: SiteSettingValueMap[SiteSettingKey] | null;
	after: SiteSettingValueMap[SiteSettingKey];
	ipHash?: string | null;
	userAgent?: string | null;
	createdAt: string;
}

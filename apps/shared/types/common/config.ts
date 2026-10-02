export interface GradingModelConfig {
	id: string;
	name: string;
	description: string;
	premium?: boolean;
	features: string[];
	advantages?: string[];
	usageScenario?: string;
	warning?: string;
}

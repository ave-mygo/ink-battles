export interface PercentileCategory {
	percentile: number;
	totalSamples: number;
	hasEnoughData: boolean;
}

export interface ScorePercentileResult {
	percentile: number;
	totalSamples: number;
	modelName: string;
	hasEnoughData: boolean;
	global?: PercentileCategory;
	byMode?: PercentileCategory & { modeName: string };
	byModeAndModel?: PercentileCategory & { modeName: string; modelName: string };
}

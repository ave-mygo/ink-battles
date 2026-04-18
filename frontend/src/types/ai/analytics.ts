/**
 * 单项百分位数据
 */
export interface PercentileCategory {
	/** 百分位数值 (0-100) */
	percentile: number;
	/** 总样本数 */
	totalSamples: number;
	/** 是否有足够的数据进行计算 */
	hasEnoughData: boolean;
}

/**
 * 百分位数计算结果（含三个维度）
 */
export interface ScorePercentileResult {
	/** 百分位数值 (0-100) - 按模型 */
	percentile: number;
	/** 总样本数 - 按模型 */
	totalSamples: number;
	/** 使用的模型名称 */
	modelName: string;
	/** 是否有足够的数据进行计算 */
	hasEnoughData: boolean;
	/** 全站百分位（所有模型 + 所有模式） */
	global?: PercentileCategory;
	/** 按模式分组的百分位 */
	byMode?: PercentileCategory & { modeName: string };
	/** 按模式+模型分组的百分位 */
	byModeAndModel?: PercentileCategory & { modeName: string; modelName: string };
}

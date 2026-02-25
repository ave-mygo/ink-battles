/**
 * 百分位数计算结果
 */
export interface ScorePercentileResult {
	/** 百分位数值 (0-100) */
	percentile: number;
	/** 总样本数 */
	totalSamples: number;
	/** 使用的模型名称 */
	modelName: string;
	/** 是否有足够的数据进行计算 */
	hasEnoughData: boolean;
}

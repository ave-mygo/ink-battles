"use server";
import type { ScorePercentileResult } from "@/types/ai";

import { db_name } from "@/lib/constants";
import { db_count } from "@/lib/db";
import "server-only";

/**
 * 计算单项百分位数据
 * @param currentScore 当前分数
 * @param filter MongoDB 查询过滤条件
 * @returns 百分位数据
 */
const calculatePercentile = async (
	currentScore: number,
	filter: Record<string, unknown>,
): Promise<{ percentile: number; totalSamples: number; hasEnoughData: boolean }> => {
	const totalSamples = await db_count(db_name, "analysis_requests", filter);

	if (totalSamples === 0) {
		return { percentile: 0, totalSamples: 0, hasEnoughData: false };
	}

	const lowerOrEqualCount = await db_count(db_name, "analysis_requests", {
		...filter,
		"article.output.overallScore": { $lte: currentScore },
	});

	const percentile = (lowerOrEqualCount / totalSamples) * 100;

	return {
		percentile: Number(percentile.toFixed(1)),
		totalSamples,
		hasEnoughData: totalSamples >= 10,
	};
};

/**
 * 计算给定分数在所有分析记录中的百分位数（支持三种维度）
 * 1. 按模型分组
 * 2. 按模式分组（可选）
 * 3. 按模式+模型分组（可选）
 * @param currentScore 当前分数
 * @param modelName 使用的模型名称
 * @param modeName 使用的评分模式名称（可选）
 * @returns 百分位数计算结果，如果计算失败则返回 null
 */
export const getScorePercentile = async (
	currentScore: number,
	modelName: string,
	modeName?: string,
): Promise<ScorePercentileResult | null> => {
	try {
		// 1. 按模型分组的百分位（保持原有逻辑）
		const byModel = await calculatePercentile(currentScore, {
			"metadata.modelName": modelName,
		});

		const result: ScorePercentileResult = {
			percentile: byModel.percentile,
			totalSamples: byModel.totalSamples,
			modelName,
			hasEnoughData: byModel.hasEnoughData,
		};

		// 2. 按模式分组的百分位（如果提供了 modeName）
		if (modeName) {
			const modeFilter = { "article.input.mode": modeName };

			const byMode = await calculatePercentile(currentScore, modeFilter);
			result.byMode = {
				...byMode,
				modeName,
			};

			// 3. 按模式+模型分组的百分位
			const modeModelFilter = {
				"metadata.modelName": modelName,
				"article.input.mode": modeName,
			};

			const byModeAndModel = await calculatePercentile(currentScore, modeModelFilter);
			result.byModeAndModel = {
				...byModeAndModel,
				modeName,
				modelName,
			};
		}

		return result;
	} catch (error) {
		console.error("Error calculating percentile:", error);
		return null;
	}
};

/**
 * 计算最终战力值并四舍五入到最多 2 位小数
 * @param parsedResult - 包含 dimensions 数组的解析结果
 * @returns 最终得分（number），最多保留两位小数
 */
export const calculateFinalScore = async (parsedResult: {
	dimensions: Array<{
		name: string;
		score: number;
		description?: string;
	}>;
}): Promise<number> => {
	if (!parsedResult.dimensions || !Array.isArray(parsedResult.dimensions)) {
		return 0;
	}

	// 提取经典性和新锐性（只要名字包含关键字即可）
	const classicityDimension = parsedResult.dimensions.find(d =>
		d.name.includes("经典"),
	);
	const noveltyDimension = parsedResult.dimensions.find(d =>
		d.name.includes("新锐"),
	);

	// 计算基础得分（排除掉经典性和新锐性维度）
	const baseDimensions = parsedResult.dimensions.filter(
		d => !d.name.includes("经典") && !d.name.includes("新锐"),
	);

	// 检查基础分触发条件（保底机制）
	// 条件一：≥ 6 个基础维度的原始评分 > 3.5
	const countAbove35 = baseDimensions.filter(
		(d: { score: number }) => d.score > 3.5,
	).length;
	// 条件二：≥ 3 个基础维度的原始评分 > 4.0
	const countAbove40 = baseDimensions.filter(
		(d: { score: number }) => d.score > 4.0,
	).length;

	const MIN_DIMENSION_SCORE = 3;
	const shouldTriggerFloor = countAbove35 >= 6 || countAbove40 >= 3;

	if (shouldTriggerFloor) {
		// 构建触发原因描述
		const triggerReasons: string[] = [];
		if (countAbove35 >= 6)
			triggerReasons.push(`${countAbove35}个维度超过3.5分`);
		if (countAbove40 >= 3)
			triggerReasons.push(`${countAbove40}个维度超过4分`);
		const triggerInfo = `保底机制已触发（${triggerReasons.join("，")}）`;

		// 修正或标记每个基础维度
		for (const dimension of baseDimensions) {
			// 检查是否已经处理过（避免重复）
			if ((dimension as any).floorTriggered) {
				continue;
			}
			(dimension as any).floorTriggered = true;

			if (dimension.score < MIN_DIMENSION_SCORE) {
				// 低于3分的维度：修正分数并标记
				const originalScore = dimension.score;
				(dimension as any).originalScore = originalScore;
				dimension.score = MIN_DIMENSION_SCORE;
				const explanation = `${triggerInfo}，原始分${originalScore}分修正为3分`;
				if (dimension.description) {
					dimension.description = `${dimension.description}（${explanation}）`;
				} else {
					dimension.description = explanation;
				}
			} else if (dimension.score === MIN_DIMENSION_SCORE) {
				// 恰好3分的维度：标记已受保底机制保护
				const note = `${triggerInfo}，本维度评分恰好达到保底线，无需修正`;
				if (dimension.description) {
					dimension.description = `${dimension.description}（${note}）`;
				} else {
					dimension.description = note;
				}
			}
			// 高于3分的维度：无需标记
		}
	}

	// 重新计算基础分（使用修正后的分数）
	const correctedBaseScore = baseDimensions.reduce(
		(sum: number, dimension: { score: number }) => {
			return sum + (dimension.score || 0);
		},
		0,
	);

	// 获取权重（默认 1.0）
	const classicityWeight = classicityDimension?.score || 1.0;
	const noveltyWeight = noveltyDimension?.score || 1.0;

	// 计算最终战力值
	const finalScore = correctedBaseScore * classicityWeight * noveltyWeight;

	// 四舍五入到最多 2 位小数
	if (!Number.isFinite(finalScore)) {
		return 0;
	}
	const rounded = Math.round(finalScore * 100) / 100;

	return rounded;
};

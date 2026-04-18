/**
 * AI 评分系统相关类型定义
 * 包含评分维度、等级系统、兜底规则等
 */

/**
 * 评分等级枚举
 */
export type ScoreGrade = "SSS" | "SS" | "S" | "A" | "B" | "C" | "D" | "E";

/**
 * 评分等级对应的分数
 */
export const GRADE_SCORES: Record<ScoreGrade, number> = {
	SSS: 5,
	SS: 4.5,
	S: 4,
	A: 3.5,
	B: 3,
	C: 2.5,
	D: 2,
	E: 1,
};

/**
 * 评分等级对应的描述
 */
export const GRADE_DESCRIPTIONS: Record<ScoreGrade, string> = {
	SSS: "神作级 - 登峰造极，超越时代",
	SS: "卓越级 - 大师水准，臻于至善",
	S: "优秀级 - 出类拔萃，技艺精湛",
	A: "良好级 - 质量上乘，值得推荐",
	B: "合格级 - 中规中矩，完成度尚可",
	C: "勉强级 - 存在明显不足",
	D: "较差级 - 问题较多，待改进",
	E: "极差级 - 难以卒读，急需提升",
};

/**
 * 维度类型定义
 */
export interface Dimension {
	/** 维度名称 */
	name: string;
	/** 维度得分 (0-5) */
	score: number;
	/** 维度详细描述 */
	description: string;
}

/**
 * 兜底规则类型
 */
export interface FloorRule {
	/** 规则名称 */
	name: string;
	/** 规则描述 */
	description: string;
	/** 检查条件函数 */
	condition: (dimensions: Dimension[]) => boolean;
	/** 应用修正函数 */
	apply: (dimension: Dimension, index: number) => Dimension;
}

/**
 * 兜底修正结果
 */
export interface FloorAdjustment {
	/** 维度索引 */
	index: number;
	/** 维度名称 */
	dimensionName: string;
	/** 原始分数 */
	originalScore: number;
	/** 修正后分数 */
	adjustedScore: number;
	/** 修正说明 */
	reason: string;
}

/**
 * 最终得分计算结果
 */
export interface ScoreCalculationResult {
	/** 最终得分 */
	finalScore: number;
	/** 基础得分（不含权重） */
	baseScore: number;
	/** 经典性权重 */
	classicityWeight: number;
	/** 新锐性权重 */
	noveltyWeight: number;
	/** 兜底修正记录 */
	adjustments: FloorAdjustment[];
}

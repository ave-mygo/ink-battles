export type ScoreGrade = "SSS" | "SS" | "S" | "A" | "B" | "C" | "D" | "E";

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

export interface Dimension {
	name: string;
	score: number;
	description: string;
}

export interface FloorRule {
	name: string;
	description: string;
	condition: (dimensions: Dimension[]) => boolean;
	apply: (dimension: Dimension, index: number) => Dimension;
}

export interface FloorAdjustment {
	index: number;
	dimensionName: string;
	originalScore: number;
	adjustedScore: number;
	reason: string;
}

export interface ScoreCalculationResult {
	finalScore: number;
	baseScore: number;
	classicityWeight: number;
	noveltyWeight: number;
	adjustments: FloorAdjustment[];
}

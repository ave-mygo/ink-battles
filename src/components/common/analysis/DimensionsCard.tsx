"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * 分数对应的颜色类
 */
function getScoreColor(score: number): string {
	if (score >= 80)
		return "text-green-600 dark:text-green-400";
	if (score >= 60)
		return "text-blue-600 dark:text-blue-400";
	if (score >= 40)
		return "text-yellow-600 dark:text-yellow-400";
	return "text-red-600 dark:text-red-400";
}

/**
 * 分数对应的进度条颜色类
 */
function getProgressColor(percent: number): string {
	if (percent >= 80)
		return "bg-green-500 dark:bg-green-400";
	if (percent >= 60)
		return "bg-blue-500 dark:bg-blue-400";
	if (percent >= 40)
		return "bg-yellow-500 dark:bg-yellow-400";
	return "bg-red-500 dark:bg-red-400";
}

export interface Dimension {
	name: string;
	score: number;
	description?: string;
}

interface DimensionsCardProps {
	dimensions: Dimension[];
}

/**
 * 各维度评分卡片
 * 展示多个维度的评分和描述
 */
export function DimensionsCard({ dimensions }: DimensionsCardProps) {
	if (dimensions.length === 0) {
		return null;
	}

	return (
		<Card className="border-0 bg-white/80 h-full shadow-lg backdrop-blur-sm dark:bg-white/5 dark:ring-1 dark:ring-white/10">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<BarChart3 className="text-blue-600 h-5 w-5" />
					各维度评分
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{dimensions.map((dim) => {
					const getMaxScore = (dimensionName: string): number => {
						const cleanName = dimensionName.replace(/[^\u4E00-\u9FA5]/g, "");
						switch (cleanName) {
							case "经典性":
								return 2;
							case "新锐性":
								return 1.5;
							default:
								return 5;
						}
					};

					const maxScore = getMaxScore(dim.name);
					const percent = (dim.score / maxScore) * 100;

					return (
						<div key={dim.name} className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-slate-700 font-medium dark:text-slate-100">
									{dim.name}
								</span>
								<span className={`font-bold ${getScoreColor(percent)}`}>
									{dim.score}
									/
									{maxScore}
								</span>
							</div>

							{/* 使用 ShadCN Progress 组件风格 */}
							<div className="rounded-full bg-slate-100 h-2 w-full overflow-hidden dark:bg-slate-800">
								<div
									className={`rounded-full h-full transition-all duration-1000 ease-out ${getProgressColor(percent)}`}
									style={{ width: `${percent}%` }}
								/>
							</div>

							{dim.description && (
								<p className="text-sm text-slate-600 dark:text-slate-300">
									{dim.description}
								</p>
							)}
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

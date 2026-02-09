"use client";

import { BadgeCheck, BookOpen, Lightbulb, Star, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AnalysisCardProps {
	summary?: string;
	strengths: string[];
	improvements: string[];
	overallAssessment?: string;
	tags: string[];
}

/**
 * 分析报告卡片
 * 展示作品概述、优势、改进建议、总体评价和标签
 */
export function AnalysisCard({
	summary,
	strengths,
	improvements,
	overallAssessment,
	tags,
}: AnalysisCardProps) {
	const hasContent = summary || strengths.length > 0 || improvements.length > 0 || overallAssessment || tags.length > 0;

	if (!hasContent) {
		return null;
	}

	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-white/5 dark:ring-1 dark:ring-white/10">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<Lightbulb className="text-yellow-500 h-5 w-5" />
					分析报告
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 作品概述 */}
				{summary && (
					<div>
						<h4 className="text-slate-700 font-medium mb-2 flex gap-2 items-center dark:text-slate-100">
							<BookOpen className="h-4 w-4" />
							作品概述
						</h4>
						<p className="text-sm text-slate-600 leading-relaxed dark:text-slate-300">{summary}</p>
					</div>
				)}

				{/* 文章标签 */}
				{tags.length > 0 && (
					<>
						<Separator />
						<div>
							<h4 className="text-purple-700 font-medium mb-2 flex gap-2 items-center dark:text-purple-300">
								<BadgeCheck className="h-4 w-4" />
								文章标签
							</h4>
							<div className="flex flex-wrap gap-2">
								{tags.map((tag, index) => (
									<span
										key={index}
										className="text-xs text-blue-700 px-2 py-1 border border-blue-200 rounded-md bg-blue-50 cursor-pointer transition-colors dark:text-blue-300 dark:border-blue-900 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
									>
										{tag}
									</span>
								))}
							</div>
						</div>
					</>
				)}

				{/* 优势亮点 */}
				{strengths.length > 0 && (
					<>
						<Separator />
						<div>
							<h4 className="text-green-700 font-medium mb-2 flex gap-2 items-center dark:text-green-300">
								<Star className="h-4 w-4" />
								优势亮点
							</h4>
							<ul className="space-y-1">
								{strengths.map((strength, index) => (
									<li key={index} className="text-sm text-slate-600 flex gap-2 items-center dark:text-slate-300">
										<span className="text-green-500 shrink-0 dark:text-green-400">•</span>
										<span>{strength}</span>
									</li>
								))}
							</ul>
						</div>
					</>
				)}

				{/* 改进建议 */}
				{improvements.length > 0 && (
					<>
						<Separator />
						<div>
							<h4 className="text-blue-700 font-medium mb-2 flex gap-2 items-center dark:text-blue-300">
								<Target className="h-4 w-4" />
								改进建议
							</h4>
							<ul className="space-y-1">
								{improvements.map((improvement, index) => (
									<li key={index} className="text-sm text-slate-600 flex gap-2 items-center dark:text-slate-300">
										<span className="text-blue-500 shrink-0 dark:text-blue-400">•</span>
										<span>{improvement}</span>
									</li>
								))}
							</ul>
						</div>
					</>
				)}

				{/* 综合评价 */}
				{overallAssessment && (
					<>
						<Separator />
						<div>
							<h4 className="text-purple-700 font-medium mb-2 flex gap-2 items-center dark:text-purple-300">
								<BadgeCheck className="text-purple-700 h-4 w-4 dark:text-purple-300" />
								综合评价
							</h4>
							<p className="text-sm text-slate-600 dark:text-slate-300">{overallAssessment}</p>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}

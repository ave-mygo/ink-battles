import type { AnalysisOutput, AnalysisResult } from "@/types/callback/ai";
import { BadgeCheck, BarChart3, BookOpen, Lightbulb, Star, Target } from "lucide-react";
import MermaidDiagrams from "@/components/layouts/WriterPage/MermaidDiagram";
import { RadarChart } from "@/components/layouts/WriterPage/RadarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface AnalysisResultDisplayProps {
	result: AnalysisOutput;
	readonly?: boolean;
}

/**
 * 获取分数对应的颜色类
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
 * 获取分数对应的背景颜色类
 */
function getScoreBgColor(score: number): string {
	if (score >= 80)
		return "bg-green-50 dark:bg-green-950/30";
	if (score >= 60)
		return "bg-blue-50 dark:bg-blue-950/30";
	if (score >= 40)
		return "bg-yellow-50 dark:bg-yellow-950/30";
	return "bg-red-50 dark:bg-red-950/30";
}

/**
 * 分析结果展示组件
 * 可复用于历史记录详情页和公开分享页面
 * 功能与首页 WriterAnalysisResult 完全一致
 */
export function AnalysisResultDisplay({ result }: AnalysisResultDisplayProps) {
	// 解析result JSON字符串
	let data: AnalysisResult | null = null;
	try {
		data = typeof result.result === "string" ? JSON.parse(result.result) : result.result;
	} catch (error) {
		console.error("Failed to parse analysis result:", error);
		data = null;
	}

	if (!data) {
		return (
			<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				<CardContent className="text-slate-500 py-8 text-center dark:text-slate-400">
					无法解析分析结果
				</CardContent>
			</Card>
		);
	}

	const dimensions = data.dimensions || [];
	const strengths = data.strengths || [];
	const improvements = data.improvements || [];
	const mermaidDiagrams = data.mermaid_diagrams || [];
	const overallScore = data.overallScore || result.overallScore || 0;

	return (
		<div className="gap-6 grid md:grid-cols-3">
			{/* 综合战力评分卡片 */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-white/5 dark:ring-1 dark:ring-white/10">
				<CardHeader className="text-center">
					<CardTitle className="flex gap-2 items-center justify-center">
						<Star className="text-yellow-500 h-5 w-5" />
						综合战力评分
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center">
					<div className={`text-6xl font-bold mb-2 ${getScoreColor(overallScore)}`}>
						{overallScore}
					</div>
					<div className="text-xs text-slate-400 mb-2 dark:text-slate-500">凑Minato</div>
					{data.title && (
						<div className="text-lg font-semibold mb-2 dark:text-slate-100">{data.title}</div>
					)}
					{data.ratingTag && (
						<div className="text-sm text-slate-600 mb-4 dark:text-slate-300">{data.ratingTag}</div>
					)}

					{/* 最终总结性标签 */}
					{data.finalTag && (
						<div className="text-xs text-purple-600 mb-4 px-3 py-1.5 border border-purple-200 rounded-lg bg-purple-50 italic dark:text-purple-400 dark:border-purple-800 dark:bg-purple-950/30">
							「
							{data.finalTag}
							」
						</div>
					)}

					<div
						className={`text-sm font-medium px-4 py-2 rounded-full inline-flex ${getScoreBgColor(overallScore)}  ${getScoreColor(overallScore)} mb-4 dark:ring-1 dark:ring-white/10`}
					>
						{overallScore >= 80
							? "优秀作品"
							: overallScore >= 60
								? "良好作品"
								: "待提升作品"}
					</div>

					{/* 雷达图：对维度进行归一化 */}
					{dimensions.length > 0 && (
						<div className="mt-2">
							{(() => {
								const normalize = (name: string, score: number) => {
									const cleanName = name.replace(/[^\u4E00-\u9FA5]/g, "");
									// 经典性上限 2，新锐性上限 1.5，其余上限 5
									const max = cleanName === "经典性" ? 2 : cleanName === "新锐性" ? 1.5 : 5;
									// 映射到 0..5
									const mapped = Math.max(0, Math.min(5, (score / max) * 5));
									return mapped;
								};

								const labels = dimensions.map(d => d.name);
								const values = dimensions.map(d => normalize(d.name, d.score));
								return <RadarChart labels={labels} values={values} />;
							})()}
						</div>
					)}
				</CardContent>
			</Card>

			{/* 各维度评分卡片 */}
			{dimensions.length > 0 && (
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-white/5 dark:ring-1 dark:ring-white/10">
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
							return (
								<div key={dim.name} className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-slate-700 font-medium dark:text-slate-100">{dim.name}</span>
										<span className={`font-bold ${getScoreColor((dim.score / maxScore) * 100)}`}>
											{dim.score}
											/
											{maxScore}
										</span>
									</div>
									<Progress value={(dim.score / maxScore) * 100} className="h-2" />
									{dim.description && (
										<p className="text-sm text-slate-600 dark:text-slate-300">{dim.description}</p>
									)}
								</div>
							);
						})}
					</CardContent>
				</Card>
			)}

			{/* 分析报告卡片 */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-white/5 dark:ring-1 dark:ring-white/10">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center">
						<Lightbulb className="text-yellow-500 h-5 w-5" />
						分析报告
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* 作品概述 */}
					{data.summary && (
						<div>
							<h4 className="text-slate-700 font-medium mb-2 flex gap-2 items-center dark:text-slate-100">
								<BookOpen className="h-4 w-4" />
								作品概述
							</h4>
							<p className="text-sm text-slate-600 leading-relaxed dark:text-slate-300">{data.summary}</p>
						</div>
					)}

					{/* 文章标签 */}
					{data.tags && data.tags.length > 0 && (
						<>
							<Separator />
							<div>
								<h4 className="text-purple-700 font-medium mb-2 flex gap-2 items-center dark:text-purple-300">
									<BadgeCheck className="h-4 w-4" />
									文章标签
								</h4>
								<div className="flex flex-wrap gap-2">
									{data.tags.map((tag, index) => (
										<span
											key={index}
											className="text-xs text-blue-700 px-2 py-1 border border-blue-200 rounded-md bg-blue-50 transition-colors dark:text-blue-300 dark:border-blue-900 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
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
										<li key={index} className="text-sm text-slate-600 flex gap-2 items-start dark:text-slate-300">
											<span className="text-green-500 mt-1 dark:text-green-400">•</span>
											{strength}
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
										<li key={index} className="text-sm text-slate-600 flex gap-2 items-start dark:text-slate-300">
											<span className="text-blue-500 mt-1 dark:text-blue-400">•</span>
											{improvement}
										</li>
									))}
								</ul>
							</div>
						</>
					)}

					{/* 综合评价 */}
					{data.overallAssessment && (
						<>
							<Separator />
							<div>
								<h4 className="text-purple-700 font-medium mb-2 flex gap-2 items-center dark:text-purple-300">
									<BadgeCheck className="text-purple-700 h-4 w-4 dark:text-purple-300" />
									综合评价
								</h4>
								<p className="text-sm text-slate-600 dark:text-slate-300">{data.overallAssessment}</p>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Mermaid 结构分析图表 */}
			{mermaidDiagrams.length > 0 && (
				<MermaidDiagrams diagrams={mermaidDiagrams} />
			)}
		</div>
	);
}

"use client";

import type { AnalysisOutput, AnalysisResult, MermaidDiagram } from "@/types/callback/ai";
import { BadgeCheck, BarChart3, BookOpen, Heart, Lightbulb, Share2, Star, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import MermaidDiagrams from "@/components/layouts/WriterPage/MermaidDiagram";
import { RadarChart } from "@/components/layouts/WriterPage/RadarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getScorePercentile } from "@/lib/ai";

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
 * 分数对应的背景颜色类
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
 * 维度数据结构
 */
interface Dimension {
	name: string;
	score: number;
	description?: string;
}

/**
 * 统一的分析结果展示组件
 * 支持两种使用方式：
 * 1. 传入 parsed result 对象（首页实时分析）
 * 2. 传入数据库记录（历史记录、分享页面）
 */
export function UnifiedAnalysisDisplay({
	// 方式1：直接传入解析后的结果对象
	analysisResult,
	// 方式2：传入数据库记录
	result,
	// 模型名称
	modelName,
	// 额外功能开关
	showShare = false,
	showSponsor = false,
	showPercentile = false,
}: {
	// 优先使用 analysisResult（首页实时分析）
	analysisResult?: {
		overallScore: number;
		overallAssessment: string;
		title: string;
		ratingTag: string;
		finalTag?: string;
		summary: string;
		tags?: string[];
		dimensions: Dimension[];
		strengths: string[];
		improvements: string[];
		mermaid_diagrams?: MermaidDiagram[];
	};
	// 或者使用 result（历史记录、分享页面）
	result?: AnalysisOutput;
	// 模型名称（可从外部传入）
	modelName?: string;
	// 是否显示分享按钮
	showShare?: boolean;
	// 是否显示赞助按钮和文案
	showSponsor?: boolean;
	// 是否显示百分位排名
	showPercentile?: boolean;
}) {
	const [percentile, setPercentile] = useState<string | null>(null);

	// 解析数据
	let data: AnalysisResult | null = null;
	let displayModelName: string | undefined = modelName;
	let overallScore = 0;

	if (analysisResult) {
		// 方式1：直接使用传入的结果对象
		data = analysisResult as AnalysisResult;
		overallScore = analysisResult.overallScore;
	} else if (result) {
		// 方式2：从数据库记录解析
		try {
			const parsedData = typeof result.result === "string" ? JSON.parse(result.result) : result.result;
			if (parsedData) {
				data = parsedData;
				overallScore = parsedData.overallScore || result.overallScore || 0;
				// 如果没有外部传入 modelName，则使用 result 中的
				if (!displayModelName) {
					displayModelName = result.modelName;
				}
			}
		} catch (error) {
			console.error("Failed to parse analysis result:", error);
		}
	}

	// 获取百分位（如果启用）
	useEffect(() => {
		if (showPercentile && overallScore > 0) {
			const fetchPercentile = async () => {
				const result = await getScorePercentile(overallScore);
				setPercentile(result);
			};
			fetchPercentile();
		}
	}, [showPercentile, overallScore]);

	// 分享功能
	const handleShare = async () => {
		if (!data)
			return;

		const summary = data.summary || "暂无概述";
		const title = data.title || "未知称号";
		const ratingTag = data.ratingTag || "未知标签";
		const dimensions = data.dimensions || [];
		const strengths = data.strengths || [];
		const improvements = data.improvements || [];

		let shareText = `我在作家战力分析系统获得了${overallScore}分的评分！\n\n`;

		if (summary !== "暂无概述") {
			shareText += `📖 作品概述：${summary}\n\n`;
		}

		shareText += `🏆 称号：${title}\n🏷️ 标签：${ratingTag}\n\n`;

		if (dimensions.length > 0) {
			shareText += `📊 维度分析：\n${dimensions.map(d => `• ${d.name}: ${d.score}\n ${d.description}`).join("\n")}\n\n`;
		}

		if (strengths.length > 0) {
			shareText += `✨ 主要优势：\n${strengths.map(s => `• ${s}`).join("\n")}\n\n`;
		}

		if (improvements.length > 0) {
			shareText += `🎯 改进建议：\n${improvements.map(i => `• ${i}`).join("\n")}\n\n`;
		}

		shareText += `快来试试你的作品能得多少分吧！\n\n#作家战力分析系统 #文学评测`;

		try {
			if (navigator.share) {
				await navigator.share({
					title: "我的作家战力分析结果",
					text: shareText,
					url: window.location.origin,
				});
				toast.success("分享成功！");
			} else {
				await navigator.clipboard.writeText(`${shareText}\n\n${window.location.origin}`);
				toast.success("分析结果已复制到剪贴板！");
			}
		} catch (error) {
			console.error("分享失败:", error);
			toast.error("分享失败，请重试");
		}
	};

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
	const tags = data.tags || [];
	const mermaidDiagrams = data.mermaid_diagrams || [];

	return (
		<div className="gap-6 grid md:grid-cols-3">
			{/* Score Card */}
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
					{displayModelName && (
						<div className="text-xs text-blue-600 mb-3 px-3 py-1.5 border border-blue-200 rounded-full bg-blue-50 inline-block dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/30">
							使用模型：
							{displayModelName}
						</div>
					)}
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
						className={`text-sm font-medium px-4 py-2 rounded-full inline-flex ${getScoreBgColor(
							overallScore,
						)}  ${getScoreColor(overallScore)} mb-4 dark:ring-1 dark:ring-white/10`}
					>
						{overallScore >= 80
							? "优秀作品"
							: overallScore >= 60
								? "良好作品"
								: "待提升作品"}
					</div>

					{/* 雷达图：对维度进行 0..5 归一化 */}
					{dimensions.length > 0 && (
						<div className="mt-2">
							{(() => {
								const normalize = (name: string, score: number) => {
									const cleanName = name.replace(/[^\u4E00-\u9FA5]/g, "");
									// 经典性上限 2，新锐性上限 1.5，其余上限 5
									const max = cleanName === "经典性" ? 2 : cleanName === "新锐性" ? 1.5 : 5;
									// 映射到 0..5：score/max * 5
									const mapped = Math.max(0, Math.min(5, (score / max) * 5));
									return mapped;
								};

								const labels = dimensions.map(d => d.name);
								const values = dimensions.map(d => normalize(d.name, d.score));
								return <RadarChart labels={labels} values={values} />;
							})()}
						</div>
					)}

					{/* 百分位排名 */}
					{showPercentile && percentile && (
						<div className="text-sm text-slate-600 mt-4 dark:text-slate-300">
							你的作品评分超过了在本站评分记录中
							{" "}
							<span className="text-red-500 font-bold dark:text-red-400">
								{percentile}
								%
							</span>
							的作品
						</div>
					)}

					{/* 赞助文案和按钮 */}
					{showSponsor && (
						<>
							<Separator className="my-4" />
							<div className="text-sm text-slate-600 space-y-2 dark:text-slate-300">
								<p>
									作家战力系统对所有人永远免费开放。你现在所用的这一次评分，是前面某个用户匿名捐赠、共享或是开发者投入所留下的机会。
								</p>
								<p>
									平台每次调用模型将消耗一部分运行成本，剩下的极少部分作为开发与维护支持。你不需要付款也可以使用，但如果你愿意为下一个陌生创作者点一次灯，我们将一同延续这个系统的生命。
								</p>
								<p>你的每一笔付出，不是消费，而是共建。</p>
							</div>
							<div className="mt-4 flex gap-2">
								<Link
									href="/sponsors"
									className="bg-primary hover:bg-primary/90 text-sm text-white font-medium px-4 py-2 rounded-md inline-flex flex-1 items-center justify-center"
								>
									<Heart className="mr-2 h-4 w-4" />
									成为赞助者
								</Link>
								{showShare && (
									<button
										type="button"
										onClick={handleShare}
										className="text-sm text-white font-medium px-4 py-2 rounded-md bg-blue-600 inline-flex flex-1 items-center justify-center hover:bg-blue-700"
									>
										<Share2 className="mr-2 h-4 w-4" />
										一键分享
									</button>
								)}
							</div>
						</>
					)}

					{/* 仅显示分享按钮（不显示赞助文案） */}
					{showShare && !showSponsor && (
						<div className="mt-4">
							<button
								type="button"
								onClick={handleShare}
								className="text-sm text-white font-medium px-4 py-2 rounded-md bg-blue-600 inline-flex w-full items-center justify-center hover:bg-blue-700"
							>
								<Share2 className="mr-2 h-4 w-4" />
								一键分享
							</button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dimensions Card */}
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

			{/* Analysis Card */}
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

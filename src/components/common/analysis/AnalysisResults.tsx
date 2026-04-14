"use client";

import type { Dimension } from "@/components/common/analysis/DimensionsCard";
import type { AnalysisOutput, AnalysisResult, ScorePercentileResult } from "@/types/ai";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AnalysisCard } from "@/components/common/analysis/AnalysisCard";
import { DimensionsCard } from "@/components/common/analysis/DimensionsCard";
import { MermaidDiagramsSection } from "@/components/common/analysis/MermaidDiagramsSection";
import { ScoreCard } from "@/components/common/analysis/ScoreCard";
import { SearchCredentials } from "@/components/common/SearchCredentials";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 分析结果统一容器组件
 * 组织 SearchCredentials 和各个分析卡片为同级组件
 * 支持两种使用方式：
 * 1. 传入 parsed result 对象（首页实时分析）
 * 2. 传入数据库记录（历史记录、分享页面）
 */
export function AnalysisResults({
	analysisResult,
	result,
	searchInfo,
	modelName,
	modeName,
	percentileData,
	showShare = false,
	showSponsor = false,
	compactMode = false, // 新增精简模式
	analysisId, // 新增 analysisId，提供给完整报告详情页
}: {
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
		authorMatches?: AnalysisResult["authorMatches"];
		mermaid_diagrams?: Array<{ type: string; title: string; code: string }>;
	};
	result?: AnalysisOutput;
	searchInfo?: {
		searchResults?: string;
		searchWebPages?: Array<{ uri: string; title?: string }>;
	} | null;
	modelName?: string;
	modeName?: string;
	showShare?: boolean;
	showSponsor?: boolean;
	percentileData?: ScorePercentileResult | null;
	compactMode?: boolean;
	analysisId?: string;
}) {
	// 解析数据
	let data: AnalysisResult | null = null;
	let displayModelName: string | undefined = modelName;
	let overallScore = 0;

	if (analysisResult) {
		data = analysisResult as AnalysisResult;
		overallScore = analysisResult.overallScore;
	} else if (result) {
		overallScore = result.overallScore || 0;
		try {
			const parsedData = typeof result.result === "string" ? JSON.parse(result.result) : result.result;
			if (parsedData) {
				data = parsedData;
				if (!displayModelName) {
					displayModelName = result.modelName;
				}
			}
		} catch (error) {
			console.error("Failed to parse analysis result:", error);
		}
	}

	if (!data) {
		return (
			<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				<CardContent className="text-slate-500 py-8 text-center dark:text-slate-400">
					无法解析分析结果
					{analysisResult && <div className="text-xs text-slate-400 mt-2">analysisResult 已传入但解析失败</div>}
					{result && <div className="text-xs text-slate-400 mt-2">result 已传入但解析失败</div>}
				</CardContent>
			</Card>
		);
	}

	// 极简模式（首页使用）
	if (compactMode) {
		return (
			<div className="animate-in fade-in slide-in-from-bottom-4 p-8 border border-slate-200 rounded-2xl bg-white/80 flex flex-col shadow-sm duration-500 items-center justify-center space-y-8 dark:border-slate-800 dark:bg-slate-900/80">
				<div className="text-center space-y-4">
					<h2 className="text-2xl text-slate-800 font-bold flex items-center justify-center dark:text-slate-100">
						<span className="text-sm text-green-700 font-medium mr-3 px-3 py-1 border border-green-200 rounded-full bg-green-100 dark:text-green-400 dark:border-green-800 dark:bg-green-900/50">✨ 分析完成</span>
						评测核心结果
					</h2>
					<div className="py-6 flex flex-col items-center justify-center">
						<div className="text-7xl text-transparent leading-none font-black from-blue-600 to-indigo-600 bg-linear-to-br bg-clip-text md:text-8xl dark:from-blue-400 dark:to-indigo-400">
							{overallScore}
						</div>
						<p className="text-sm text-slate-500 tracking-widest font-medium mt-4 uppercase dark:text-slate-400">
							综合战力评分
						</p>
					</div>
				</div>

				<div className="flex flex-col max-w-sm w-full items-center space-y-4">
					{analysisId
						? (
								<Button size="lg" className="text-base font-medium rounded-xl h-14 w-full shadow-md transition-all hover:shadow-lg hover:-translate-y-1" asChild>
									<Link href={`/dashboard/history/${analysisId}`}>
										查看完整深度报告
										<ArrowRight className="ml-2 h-5 w-5" />
									</Link>
								</Button>
							)
						: (
								<div className="text-sm text-amber-700 p-4 border border-amber-200 rounded-xl bg-amber-50 flex w-full shadow-sm items-center dark:text-amber-400 dark:border-amber-900 dark:bg-amber-950/30">
									<AlertCircle className="mr-3 shrink-0 h-5 w-5" />
									未能获取报告ID，请前往历史记录重试。
								</div>
							)}
				</div>
			</div>
		);
	}

	const dimensions = data.dimensions || [];
	const strengths = data.strengths || [];
	const improvements = data.improvements || [];
	const tags = data.tags || [];
	const mermaidDiagrams = data.mermaid_diagrams || [];

	/**
	 * 生成分享文本内容
	 */
	const generateShareText = () => {
		const summary = data?.summary || "暂无概述";
		const title = data?.title || "未知称号";
		const ratingTag = data?.ratingTag || "未知标签";

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

		return shareText;
	};

	return (
		<div className="space-y-6">
			{/* 搜索凭证 - 与分析结果为同级组件 */}
			{searchInfo?.searchResults && (
				<SearchCredentials
					searchResults={searchInfo.searchResults}
					searchWebPages={searchInfo.searchWebPages}
				/>
			)}

			{/* 分析结果卡片网格 */}
			<div className="gap-6 grid md:grid-cols-3">
				{/* 综合战力评分 */}
				<ScoreCard
					overallScore={overallScore}
					title={data.title}
					ratingTag={data.ratingTag}
					finalTag={data.finalTag}
					dimensions={dimensions}
					modelName={displayModelName}
					modeName={modeName}
					showShare={showShare}
					showSponsor={showSponsor}
					percentileData={percentileData}
					onGenerateShareText={generateShareText}
				/>

				{/* 各维度评分 */}
				<DimensionsCard dimensions={dimensions} />

				{/* 分析报告 */}
				<AnalysisCard
					summary={data.summary}
					strengths={strengths}
					improvements={improvements}
					overallAssessment={data.overallAssessment}
					tags={tags}
					authorMatches={data.authorMatches}
				/>

				{/* Mermaid 图表 */}
				<MermaidDiagramsSection diagrams={mermaidDiagrams} />
			</div>
		</div>
	);
}

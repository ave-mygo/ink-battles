"use client";

import type { Dimension } from "@/components/common/analysis/DimensionsCard";
import type { ScorePercentileResult } from "@/lib/ai";
import type { AnalysisOutput, AnalysisResult } from "@/types/callback/ai";
import { AnalysisCard } from "@/components/common/analysis/AnalysisCard";
import { DimensionsCard } from "@/components/common/analysis/DimensionsCard";
import { MermaidDiagramsSection } from "@/components/common/analysis/MermaidDiagramsSection";
import { ScoreCard } from "@/components/common/analysis/ScoreCard";
import { SearchCredentials } from "@/components/common/SearchCredentials";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 分析结果统一容器组件
 * 组织 SearchCredentials 和各个分析卡片为同级组件
 * 支持两种使用方式：
 * 1. 传入 parsed result 对象（首页实时分析）
 * 2. 传入数据库记录（历史记录、分享页面）
 */
export function AnalysisResults({
	// 方式1：直接传入解析后的结果对象
	analysisResult,
	// 方式2：传入数据库记录
	result,
	// 搜索信息
	searchInfo,
	// 模型名称
	modelName,
	// 百分位信息
	percentileData,
	// 额外功能开关
	showShare = false,
	showSponsor = false,
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
		mermaid_diagrams?: Array<{ type: string; title: string; code: string }>;
	};
	// 或者使用 result（历史记录、分享页面）
	result?: AnalysisOutput;
	// 搜索信息
	searchInfo?: {
		searchResults?: string;
		searchWebPages?: Array<{ uri: string; title?: string }>;
	} | null;
	// 模型名称（可从外部传入）
	modelName?: string;
	// 是否显示分享按钮
	showShare?: boolean;
	// 是否显示赞助按钮和文案
	showSponsor?: boolean;
	// 百分位数据（由服务端传入）
	percentileData?: ScorePercentileResult | null;
}) {
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
				/>

				{/* Mermaid 图表 */}
				<MermaidDiagramsSection diagrams={mermaidDiagrams} />
			</div>
		</div>
	);
}

"use client";

import { BadgeCheck, BarChart3, BookOpen, Heart, Lightbulb, Share2, Star, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ShareImageGenerator from "@/components/ShareImageGenerator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getScorePercentile } from "@/lib/utils-server";

interface Dimension {
	name: string;
	score: number;
	description: string;
}

interface WriterAnalysisResultProps {
	analysisResult: {
		overallScore: number;
		overallAssessment: string;
		title: string;
		ratingTag: string;
		summary: string;
		dimensions: Dimension[];
		strengths: string[];
		improvements: string[];
	};
	getScoreColor: (score: number) => string;
	getScoreBgColor: (score: number) => string;
}

export default function WriterAnalysisResult({
	analysisResult,
	getScoreColor,
	getScoreBgColor,
}: WriterAnalysisResultProps) {
	const [percentile, setPercentile] = useState<string | null>(null);

	useEffect(() => {
		const fetchPercentile = async () => {
			const result = await getScorePercentile(analysisResult.overallScore);
			setPercentile(result);
		};
		fetchPercentile();
	}, [analysisResult.overallScore]);

	const handleShare = async () => {
		// 确保所有数据都存在，如果不存在则提供默认值
		const summary = analysisResult.summary || "暂无概述";
		const title = analysisResult.title || "未知称号";
		const ratingTag = analysisResult.ratingTag || "未知标签";
		const strengths = analysisResult.strengths || [];
		const improvements = analysisResult.improvements || [];
		const dimensions = analysisResult.dimensions || [];

		let shareText = `我在作家战力分析系统获得了${analysisResult.overallScore}分的评分！\n\n`;

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
				// 使用原生分享API
				await navigator.share({
					title: "我的作家战力分析结果",
					text: shareText,
					url: window.location.origin,
				});
				toast.success("分享成功！");
			} else {
				// 复制到剪贴板
				await navigator.clipboard.writeText(`${shareText}\n\n${window.location.origin}`);
				toast.success("分析结果已复制到剪贴板！");
			}
		} catch (error) {
			console.error("分享失败:", error);
			toast.error("分享失败，请重试");
		}
	};

	return (
		<div className="gap-6 grid md:grid-cols-3">
			{/* Score Card */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader className="text-center">
					<CardTitle className="flex gap-2 items-center justify-center">
						<Star className="text-yellow-500 h-5 w-5" />
						综合战力评分
					</CardTitle>
				</CardHeader>
				<CardContent className="text-center">
					<div className={`text-6xl font-bold mb-2 ${getScoreColor(analysisResult.overallScore)}`}>
						{analysisResult.overallScore}
					</div>
					<div className="text-xs text-slate-400 mb-2">狸希Rikki</div>
					<div className="text-lg font-semibold mb-2">{analysisResult.title}</div>
					<div className="text-sm text-slate-600 mb-4">{analysisResult.ratingTag}</div>

					<div
						className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${getScoreBgColor(
							analysisResult.overallScore,
						)} ${getScoreColor(analysisResult.overallScore)} mb-4`}
					>
						{analysisResult.overallScore >= 80
							? "优秀作品"
							: analysisResult.overallScore >= 60
								? "良好作品"
								: "待提升作品"}
					</div>

					{percentile && (
						<div className="text-sm text-slate-600 mt-4">
							你的作品评分超过了在本站评分记录中
							{" "}
							<span className="text-red-500 font-bold">
								{percentile}
								%
							</span>
							的作品
						</div>
					)}

					<Separator className="my-4" />

					<div className="text-sm text-slate-600 space-y-2">
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
						<button
							type="button"
							onClick={handleShare}
							className="text-sm text-white font-medium px-4 py-2 rounded-md bg-blue-600 inline-flex flex-1 items-center justify-center hover:bg-blue-700"
						>
							<Share2 className="mr-2 h-4 w-4" />
							一键分享
						</button>
					</div>

					<div className="mt-4">
						<ShareImageGenerator
							data={{
								overallScore: analysisResult.overallScore,
								title: analysisResult.title,
								ratingTag: analysisResult.ratingTag,
								summary: analysisResult.summary,
								dimensions: analysisResult.dimensions,
								strengths: analysisResult.strengths,
								improvements: analysisResult.improvements,
								overallAssessment: analysisResult.overallAssessment,
								percentile,
							}}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Dimensions Card */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center">
						<BarChart3 className="text-blue-600 h-5 w-5" />
						各维度评分
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{analysisResult.dimensions.map(dim => (
						<div key={dim.name} className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-slate-700 font-medium">{dim.name}</span>
								<span className={`font-bold ${getScoreColor(dim.score)}`}>
									{dim.score}
									/5
								</span>
							</div>
							<Progress value={(dim.score / 5) * 100} className="h-2" />
							<p className="text-sm text-slate-600">{dim.description}</p>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Analysis Card */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center">
						<Lightbulb className="text-yellow-500 h-5 w-5" />
						分析报告
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h4 className="text-slate-700 font-medium mb-2 flex gap-2 items-center">
							<BookOpen className="h-4 w-4" />
							作品概述
						</h4>
						<p className="text-sm text-slate-600 leading-relaxed">{analysisResult.summary}</p>
					</div>
					<Separator />
					<div>
						<h4 className="text-green-700 font-medium mb-2 flex gap-2 items-center">
							<Star className="h-4 w-4" />
							优势亮点
						</h4>
						<ul className="space-y-1">
							{analysisResult.strengths.map(strength => (
								<li key={strength} className="text-sm text-slate-600 flex gap-2 items-start">
									<span className="text-green-500 mt-1">•</span>
									{strength}
								</li>
							))}
						</ul>
					</div>
					<Separator />
					<div>
						<h4 className="text-blue-700 font-medium mb-2 flex gap-2 items-center">
							<Target className="h-4 w-4" />
							改进建议
						</h4>
						<ul className="space-y-1">
							{analysisResult.improvements.map(improvement => (
								<li key={improvement} className="text-sm text-slate-600 flex gap-2 items-start">
									<span className="text-blue-500 mt-1">•</span>
									{improvement}
								</li>
							))}
						</ul>
					</div>
					<Separator />
					<div>
						<h4 className="text-purple-700 font-medium mb-2 flex gap-2 items-center">
							<BadgeCheck className="text-purple-700 h-4 w-4" />
							综合评价
						</h4>
						<p className="text-sm text-slate-600">{analysisResult.overallAssessment}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

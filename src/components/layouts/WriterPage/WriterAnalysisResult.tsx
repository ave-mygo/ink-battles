"use client";

import { BadgeCheck, BarChart3, Heart, Lightbulb, Star, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

					<Link
						href="/sponsors"
						className="bg-primary hover:bg-primary/90 text-sm text-white font-medium mt-4 px-4 py-2 rounded-md inline-flex items-center justify-center"
					>
						<Heart className="mr-2 h-4 w-4" />
						成为赞助者
					</Link>
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
					{analysisResult.dimensions.map((dim, index) => (
						<div key={index} className="space-y-2">
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
						<h4 className="text-green-700 font-medium mb-2 flex gap-2 items-center">
							<Star className="h-4 w-4" />
							优势亮点
						</h4>
						<ul className="space-y-1">
							{analysisResult.strengths.map((strength, index) => (
								<li key={index} className="text-sm text-slate-600 flex gap-2 items-start">
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
							{analysisResult.improvements.map((improvement, index) => (
								<li key={index} className="text-sm text-slate-600 flex gap-2 items-start">
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

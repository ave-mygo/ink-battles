"use client";

import type { ScorePercentileResult } from "@/lib/ai";
import { Copy, Heart, Share, Share2, Star } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { RadarChart } from "@/components/layouts/WriterPage/RadarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
 * 分数对应的渐变类
 */
function getScoreGradient(score: number): string {
	if (score >= 80)
		return "from-green-600 to-emerald-400 dark:from-green-400 dark:to-emerald-300";
	if (score >= 60)
		return "from-blue-600 to-cyan-400 dark:from-blue-400 dark:to-cyan-300";
	if (score >= 40)
		return "from-yellow-600 to-amber-400 dark:from-yellow-400 dark:to-amber-300";
	return "from-red-600 to-rose-400 dark:from-red-400 dark:to-rose-300";
}

/**
 * 分数对应的边框色
 */
function getScoreBorderColor(score: number): string {
	if (score >= 80)
		return "border-green-200 dark:border-green-800";
	if (score >= 60)
		return "border-blue-200 dark:border-blue-800";
	if (score >= 40)
		return "border-yellow-200 dark:border-yellow-800";
	return "border-red-200 dark:border-red-800";
}

export interface Dimension {
	name: string;
	score: number;
	description?: string;
}

interface ScoreCardProps {
	overallScore: number;
	title?: string;
	ratingTag?: string;
	finalTag?: string;
	dimensions: Dimension[];
	modelName?: string;
	showShare?: boolean;
	showSponsor?: boolean;
	showPercentile?: boolean;
	/** 百分位数据（由服务端传入） */
	percentileData?: ScorePercentileResult | null;
	onGenerateShareText?: () => string;
}

/**
 * 综合战力评分卡片
 * 显示总体评分、冠名标题、评分等级、雷达图和分享功能
 */
export function ScoreCard({
	overallScore,
	title,
	ratingTag,
	finalTag,
	dimensions,
	modelName,
	showShare = false,
	showSponsor = false,
	percentileData,
	onGenerateShareText,
}: ScoreCardProps) {
	const isMobile = useIsMobile();

	/**
	 * 使用系统分享 API 进行分享
	 */
	const handleSystemShare = async () => {
		if (!onGenerateShareText)
			return;

		const shareText = onGenerateShareText();

		try {
			await navigator.share({
				title: "我的作家战力分析结果",
				text: shareText,
				url: window.location.origin,
			});
			toast.success("分享成功！");
		} catch (error) {
			console.error("分享失败:", error);
			toast.error("分享失败，请重试");
		}
	};

	/**
	 * 复制到剪贴板
	 */
	const handleCopyToClipboard = async () => {
		if (!onGenerateShareText)
			return;

		const shareText = onGenerateShareText();

		try {
			await navigator.clipboard.writeText(`${shareText}\n\n${window.location.origin}`);
			toast.success("分析结果已复制到剪贴板！");
		} catch (error) {
			console.error("复制失败:", error);
			toast.error("复制失败，请重试");
		}
	};

	/**
	 * 检查是否可以使用原生分享 API
	 */
	const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

	/**
	 * 移动端：自动判断分享方式
	 */
	const handleMobileShare = async () => {
		if (canUseNativeShare) {
			await handleSystemShare();
		} else {
			await handleCopyToClipboard();
		}
	};

	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-white/5 dark:ring-1 dark:ring-white/10">
			<CardHeader className="pb-2 pt-8 text-center">
				<CardTitle className="flex gap-2 items-center justify-center">
					<Star className="text-yellow-500 h-5 w-5" />
					综合战力评分
				</CardTitle>
			</CardHeader>
			<CardContent className="px-6 pb-8 text-center">
				<div className="mb-3 px-6 py-2 inline-block relative">
					<div className={`text-8xl tracking-tight font-black bg-linear-to-br ${getScoreGradient(overallScore)} text-transparent select-none bg-clip-text drop-shadow-sm`}>
						{overallScore}
					</div>
					{/* 装饰性背景光晕 - 可选 */}
					<div className={`inset-0 absolute bg-linear-to-br ${getScoreGradient(overallScore)} rounded-full opacity-10 scale-150 transform blur-3xl -z-10`} />
				</div>

				<div className="mb-6 flex flex-col gap-1 items-center">
					<div className="text-xs text-slate-400 tracking-widest font-medium uppercase dark:text-slate-500">
						MINATO ANALYSIS
					</div>
					{modelName && (
						<div className="text-[10px] text-slate-500 mt-1 px-2 py-0.5 border border-slate-200 rounded-md bg-slate-100 dark:text-slate-400 dark:border-slate-700/50 dark:bg-slate-800">
							Model:
							{" "}
							{modelName}
						</div>
					)}
				</div>

				{title && (
					<div className="text-xl text-slate-800 font-bold mb-2 line-clamp-2 dark:text-slate-100">{title}</div>
				)}
				{ratingTag && (
					<div className="text-sm text-slate-600 font-medium mb-5 dark:text-slate-400">{ratingTag}</div>
				)}

				<div className="mb-8 flex flex-wrap gap-3 justify-center">
					{/* 最终总结性标签 */}
					{finalTag && (
						<div className="text-xs text-purple-700 font-semibold px-4 py-1.5 border border-purple-100 rounded-lg bg-purple-50 shadow-sm dark:text-purple-300 dark:border-purple-900/50 dark:bg-purple-900/20">
							「
							{finalTag}
							」
						</div>
					)}

					<div
						className={`text-xs font-semibold px-4 py-1.5 border rounded-lg shadow-sm ${getScoreBgColor(overallScore)}  ${getScoreColor(overallScore)}  ${getScoreBorderColor(overallScore)}`}
					>
						{overallScore >= 80
							? "优秀作品"
							: overallScore >= 60
								? "良好作品"
								: "待提升作品"}
					</div>
				</div>

				{/* 雷达图：对维度进行 0..5 归一化 */}
				{dimensions.length > 0 && (
					<div className="mb-4 mt-4">
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
				{
					percentileData
						? (
								<div className="text-sm text-slate-600 mt-4 dark:text-slate-300">
									你的作品评分超过了在本站评分记录中（
									{percentileData.modelName}
									模型，共
									{" "}
									{percentileData.totalSamples}
									{" "}
									个样本）
									<span className="text-red-500 font-bold dark:text-red-400">
										{percentileData.percentile}
										%
									</span>
									{" "}
									的作品
									{!percentileData.hasEnoughData && (
										<span className="text-xs text-slate-400 ml-2 dark:text-slate-500">
											（样本量较少，仅供参考）
										</span>
									)}
								</div>
							)
						: !modelName
								? (
										<div className="text-xs text-slate-400 mt-4 dark:text-slate-500">
											此为旧版本记录，缺少模型信息，无法显示百分位排名
										</div>
									)
								: null
				}
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
								<>
									{isMobile
										? (
												<button
													type="button"
													onClick={handleMobileShare}
													className="text-sm text-white font-medium px-4 py-2 rounded-md bg-blue-600 inline-flex flex-1 cursor-pointer items-center justify-center hover:bg-blue-700"
												>
													<Share2 className="mr-2 h-4 w-4" />
													一键分享
												</button>
											)
										: (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<button
															type="button"
															className="text-sm text-white font-medium px-4 py-2 rounded-md bg-blue-600 inline-flex flex-1 cursor-pointer items-center justify-center hover:bg-blue-700"
														>
															<Share2 className="mr-2 h-4 w-4" />
															一键分享
														</button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														{canUseNativeShare && (
															<>
																<DropdownMenuItem onClick={handleSystemShare} className="cursor-pointer">
																	<Share className="mr-2 h-4 w-4" />
																	系统分享
																</DropdownMenuItem>
																<DropdownMenuSeparator />
															</>
														)}
														<DropdownMenuItem onClick={handleCopyToClipboard} className="cursor-pointer">
															<Copy className="mr-2 h-4 w-4" />
															复制到剪贴板
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											)}
								</>
							)}
						</div>
					</>
				)}

				{/* 仅显示分享按钮（不显示赞助文案） */}
				{showShare && !showSponsor && (
					<div className="mt-4">
						{isMobile
							? (
									<button
										type="button"
										onClick={handleMobileShare}
										className="text-sm text-white font-medium px-4 py-2 rounded-md bg-blue-600 inline-flex w-full items-center justify-center hover:bg-blue-700"
									>
										<Share2 className="mr-2 h-4 w-4" />
										一键分享
									</button>
								)
							: (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												type="button"
												className="text-sm text-white font-medium px-4 py-2 rounded-md bg-blue-600 inline-flex w-full items-center justify-center hover:bg-blue-700"
											>
												<Share2 className="mr-2 h-4 w-4" />
												一键分享
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{canUseNativeShare && (
												<>
													<DropdownMenuItem onClick={handleSystemShare} className="cursor-pointer">
														<Share className="mr-2 h-4 w-4" />
														系统分享
													</DropdownMenuItem>
													<DropdownMenuSeparator />
												</>
											)}
											<DropdownMenuItem onClick={handleCopyToClipboard} className="cursor-pointer">
												<Copy className="mr-2 h-4 w-4" />
												复制到剪贴板
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

"use client";

import { Activity, ExternalLink, Heart, MessageCircle, PenTool } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function WriterAnalysisHeader() {
	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex flex-col gap-4 items-center justify-center sm:flex-row sm:gap-6">
				<div className="p-4 rounded-xl shadow-lg from-blue-600 to-purple-600 bg-gradient-to-r dark:from-slate-700 dark:to-slate-800">
					<PenTool className="text-white h-8 w-8" />
				</div>
				<h1 className="text-3xl text-slate-800 leading-tight font-bold sm:text-4xl dark:text-slate-100">作家战力分析系统</h1>
			</div>
			<p className="text-lg text-slate-600 mx-auto mb-6 max-w-2xl dark:text-slate-300">
				基于AI技术的专业文本分析工具，为您的创作提供深度洞察
			</p>

			{/* 导航链接区 - 优化移动端布局 */}
			<div className="mb-6 flex flex-col gap-4 items-center">
				<div className="gap-3 grid grid-cols-1 max-w-2xl w-full items-center sm:grid-cols-3">
					<Link
						href="/sponsors"
						className="text-pink-600 px-4 py-2.5 rounded-lg bg-pink-50 inline-flex gap-2 transition-colors duration-150 items-center justify-center dark:text-pink-300 hover:text-pink-700 dark:bg-pink-900/15 hover:bg-pink-100 dark:hover:bg-pink-900/25"
					>
						<Heart className="h-4 w-4" />
						赞助支持我们
						<ExternalLink className="h-3 w-3" />
					</Link>
					<Link
						href="/status"
						className="text-green-600 px-4 py-2.5 rounded-lg bg-green-50 inline-flex gap-2 transition-colors duration-150 items-center justify-center dark:text-green-300 hover:text-green-700 dark:bg-green-900/15 hover:bg-green-100 dark:hover:bg-green-900/25"
					>
						<Activity className="h-4 w-4" />
						前往状态页
						<ExternalLink className="h-3 w-3" />
					</Link>
					<Link
						href="https://qm.qq.com/q/D6AK1DEQtq"
						target="_blank"
						rel="noopener noreferrer"
						className="text-purple-600 px-4 py-2.5 rounded-lg bg-purple-50 inline-flex gap-2 transition-colors duration-150 items-center justify-center dark:text-purple-300 hover:text-purple-700 dark:bg-purple-900/15 hover:bg-purple-100 dark:hover:bg-purple-900/25"
					>
						<MessageCircle className="h-4 w-4" />
						加入QQ群
						<ExternalLink className="h-3 w-3" />
					</Link>
				</div>
			</div>
			<Card className="mt-6 border-0 rounded-xl bg-white/90 shadow-md backdrop-blur-sm dark:bg-slate-900/40">
				<div className="text-sm text-slate-500 p-2">
					<p>
						本分析报告由AI生成，AI提供的内容具有不确定性，仅供参考。测试量表由三角之外设计，站点由
						<Link href="https://www.tnxg.top/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">iykrzu</Link>
						和AI设计。
					</p>
					<p className="mt-2">
						特别鸣谢
						<Link href="https://yumetsuki.moe/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Q78KG</Link>
						的技术支持。
					</p>
					<p className="mt-1">
						想要体会更具
						<strong>趣味性</strong>
						的评价，请移步Q78KG的
						<Link href="https://ink-battles.yumetsuki.moe/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
							Ink Battles
						</Link>
					</p>
				</div>
				<div className="text-sm text-slate-500 p-2">
					<p>我们将严格保护您的隐私，并仅将您的数据用于提供本服务。</p>
					<p className="mt-2">
						您在使用本服务即视为同意将相关数据提供给为本服务提供支持的第三方服务商，以便其提供本服务。我们不对第三方服务商的行为负责。
					</p>
				</div>
				<Separator />
				<div className="text-sm text-slate-600 p-6 border-l-4 border-blue-200 from-slate-50/80 to-blue-50/80 bg-gradient-to-r backdrop-blur-sm dark:text-slate-200 dark:border-blue-400/30 dark:from-slate-800/40 dark:to-slate-900/40">
					<h3 className="text-slate-800 font-semibold mb-3 flex gap-2 items-center dark:text-slate-100">
						<PenTool className="h-4 w-4" />
						创作理念
					</h3>
					<div className="leading-relaxed space-y-3">
						<p className="text-slate-700 font-medium dark:text-slate-200">
							写你想写的，评你想评的！
						</p>
						<p>
							更多的提示词，更多的偏爱称号，更多的评价维度，由你创造。
						</p>
						<p className="italic">
							语言是认知的边界，也是奴役之锁——我们言说他者的语言，便成为他者的奴隶。语言是失败的，是尸体。
						</p>
						<p>
							可惜，你来晚了，实在界、象征界、想象界的博洛米绳结，已经松开了……
						</p>
						<p>
							无意识与【我们从哪来】的哲学议题就像是北冰洋，我们站在北冰洋上不断浮动的，大块的冰，猜测着冰的世界的距离和模样。
						</p>
						<p>
							冰块在变化——聚拢，凝固，融化，一切都是相对的标准，但我们却不得不从中探出一条路。
						</p>
					</div>
				</div>
			</Card>
		</div>
	);
}

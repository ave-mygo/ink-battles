"use client";

import { Activity, ExternalLink, Heart, MessageCircle, PenTool } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function WriterAnalysisHeader() {
	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex flex-col gap-4 items-center justify-center sm:flex-row sm:gap-6">
				<div className="p-4 rounded-xl shadow-lg from-blue-600 to-purple-600 bg-gradient-to-r">
					<PenTool className="text-white h-8 w-8" />
				</div>
				<h1 className="text-3xl text-slate-800 leading-tight font-bold sm:text-4xl">作家战力分析系统</h1>
			</div>
			<p className="text-lg text-slate-600 mx-auto mb-6 max-w-2xl">
				基于AI技术的专业文本分析工具，为您的创作提供深度洞察
			</p>
			{/* 导航链接区 - 优化移动端布局 */}
			<div className="mb-6 flex flex-col gap-4 items-center">
				<Link
					href="https://qm.qq.com/q/D6AK1DEQtq"
					target="_blank"
					rel="noopener noreferrer"
					className="text-purple-600 px-6 py-2.5 rounded-lg bg-purple-50 flex gap-2 max-w-2xl w-full transition-colors duration-150 items-center justify-center hover:text-purple-700 hover:bg-purple-100"
				>
					<MessageCircle className="h-4 w-4" />
					加入QQ群：625618470
					<ExternalLink className="h-3 w-3" />
				</Link>

				{/* 功能链接网格布局 */}
				<div className="gap-3 grid grid-cols-1 max-w-2xl w-full items-center sm:grid-cols-3">
					<Link
						href="/sponsors"
						className="text-pink-600 px-4 py-2.5 rounded-lg bg-pink-50 inline-flex gap-2 transition-colors duration-150 items-center justify-center hover:text-pink-700 hover:bg-pink-100"
					>
						<Heart className="h-4 w-4" />
						赞助支持我们
						<ExternalLink className="h-3 w-3" />
					</Link>
					<Link
						href="/status"
						className="text-green-600 px-4 py-2.5 rounded-lg bg-green-50 inline-flex gap-2 transition-colors duration-150 items-center justify-center hover:text-green-700 hover:bg-green-100"
					>
						<Activity className="h-4 w-4" />
						前往状态页
						<ExternalLink className="h-3 w-3" />
					</Link>
					<Link
						href="https://github.com/ave-mygo/ink-battles"
						target="_blank"
						rel="noopener noreferrer"
						className="text-gray-600 px-4 py-2.5 rounded-lg bg-gray-50 inline-flex gap-2 transition-colors duration-150 items-center justify-center hover:text-gray-700 hover:bg-gray-100"
					>
						<span className="h-4 w-4 inline-block">
							<svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
						</span>
						开源代码
						<ExternalLink className="h-3 w-3" />
					</Link>
				</div>
			</div>
			<Card className="mt-6 border-0 rounded-xl bg-white/90 shadow-md backdrop-blur-sm">
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
				<div className="text-sm text-slate-600 p-6 border-l-4 border-blue-200 from-slate-50/80 to-blue-50/80 bg-gradient-to-r backdrop-blur-sm">
					<h3 className="text-slate-800 font-semibold mb-3 flex gap-2 items-center">
						<PenTool className="h-4 w-4" />
						创作理念
					</h3>
					<div className="leading-relaxed space-y-3">
						<p className="text-slate-700 font-medium">
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

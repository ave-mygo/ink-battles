"use client";

import { Activity, ExternalLink, Github, Heart, MessageCircle, PenTool } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function WriterAnalysisHeader() {
	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex gap-4 items-center justify-center">
				<div className="p-4 rounded-xl bg-blue-600">
					<PenTool className="text-white h-8 w-8" />
				</div>
				<h1 className="text-4xl text-slate-800 font-bold">作家战力分析系统</h1>
			</div>
			<p className="text-lg text-slate-600 mb-6">
				基于AI技术的专业文本分析工具，为您的创作提供深度洞察
			</p>
			<div className="mb-6 flex flex-col gap-3 items-center">
				<Link
					href="https://qm.qq.com/q/D6AK1DEQtq"
					target="_blank"
					rel="noopener noreferrer"
					className="text-purple-700 px-4 py-2 rounded-lg bg-purple-50 inline-flex gap-2 transition-colors items-center hover:bg-purple-100"
				>
					<MessageCircle className="h-4 w-4" />
					加入QQ群：625618470
					<ExternalLink className="h-3 w-3" />
				</Link>
				<div className="flex flex-col gap-3 items-center sm:flex-row">
					<div className="flex flex-col gap-3 items-center sm:flex-row">
						<Link
							href="/sponsors"
							className="text-pink-700 px-4 py-2 rounded-lg bg-pink-50 inline-flex gap-2 transition-colors items-center hover:bg-pink-100"
						>
							<Heart className="h-4 w-4" />
							赞助支持我们
							<ExternalLink className="h-3 w-3" />
						</Link>
						<Link
							href="/status"
							className="text-green-700 px-4 py-2 rounded-lg bg-green-50 inline-flex gap-2 transition-colors items-center hover:bg-green-100"
						>
							<Activity className="h-4 w-4" />
							前往状态页
							<ExternalLink className="h-3 w-3" />
						</Link>
						<Link
							href="https://github.com/ave-mygo/ink-battles"
							target="_blank"
							rel="noopener noreferrer"
							className="text-gray-700 px-4 py-2 rounded-lg bg-gray-50 inline-flex gap-2 transition-colors items-center hover:bg-gray-100"
						>
							<Github className="h-4 w-4" />
							开源代码
							<ExternalLink className="h-3 w-3" />
						</Link>
					</div>
				</div>
			</div>
			<Card className="mt-6 rounded-xl">
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
				<div className="bg-gradient-to-r text-sm text-slate-600 p-6 border-l-4 border-blue-200 from-slate-50 to-blue-50">
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

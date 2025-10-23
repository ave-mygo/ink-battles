import type { Metadata } from "next";
import { Info, PenTool } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "关于我们",
		description: "了解作家战力分析系统的愿景、功能与开源信息",
	};
}

export default function AboutPage() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				{/* Header 区 */}
				<div className="mb-8 text-center">
					<div className="mb-6 flex gap-4 items-center justify-center">
						<div className="p-4 rounded-2xl flex shadow-xl items-center justify-center from-blue-500 to-indigo-600 bg-linear-to-br dark:from-blue-700 dark:to-indigo-700">
							<Info className="text-white h-8 w-8" />
						</div>
						<h1 className="text-4xl text-transparent tracking-tight font-extrabold from-slate-800 to-slate-950 bg-linear-to-r bg-clip-text drop-shadow-sm md:text-5xl dark:from-slate-100 dark:to-slate-300">
							关于本项目
						</h1>
					</div>

					{/* CTA Card */}
					<Card className="mb-8 border-0 shadow-lg from-blue-50 to-indigo-50 via-purple-50 bg-linear-to-r dark:from-slate-800/60 dark:to-slate-900/40 dark:via-slate-800/40">
						<CardContent className="p-8">
							<p className="text-xl text-slate-700 leading-relaxed font-medium mb-6 dark:text-slate-200">
								一款专为创作者打造的 AI 文本分析工具。我们通过可视化、多维度的深度反馈，助您洞悉作品潜力，提升创作水平。
							</p>
							<div className="flex flex-wrap gap-4 justify-center">
								<Button
									asChild
									size="lg"
									className="text-white font-bold px-8 py-4 rounded-full shadow-lg transition-all duration-300 from-blue-500 to-indigo-500 bg-linear-to-r hover:shadow-xl hover:scale-105 dark:from-blue-600 dark:to-indigo-600 hover:from-blue-600 hover:to-indigo-600 dark:hover:from-blue-500 dark:hover:to-indigo-500"
								>
									<Link href="/sponsors" className="flex gap-2 items-center">
										赞助支持
									</Link>
								</Button>
								<Button
									asChild
									variant="outline"
									size="lg"
									className="font-semibold px-8 py-4 border-2 border-slate-300 rounded-full shadow-sm transition-all duration-300 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md dark:hover:bg-slate-800/60"
								>
									<Link href="/" className="flex gap-2 items-center">
										返回首页
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* 内容卡片 */}
				<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-lg dark:bg-slate-900/60">
					<CardContent className="p-6 md:p-10 sm:p-8">
						<div className="space-y-8">
							<section>
								<h2 className="text-2xl text-slate-800 font-bold mb-3 dark:text-slate-100">我们的使命</h2>
								<p className="text-slate-600 leading-relaxed dark:text-slate-300">
									我们的使命是将复杂的文本分析变得简单、直观且富有启发性。借助多维度评估和清晰的解读，您可以迅速发现作品的亮点与待改进之处，甚至可以定制专属的分析视角，让 AI 成为您创作路上的得力助手。
								</p>
							</section>
							{/* ... 其他核心介绍部分保持不变 ... */}
						</div>

						<Separator className="my-8 sm:my-10" />

						<div className="space-y-6">
							{/* 声明与致谢 */}
							<section className="text-sm text-slate-600 space-y-3 dark:text-slate-300">
								<h3 className="text-base text-slate-700 font-semibold dark:text-slate-200">声明与致谢</h3>
								<p>
									本分析报告由 AI 生成，其内容具有不确定性，仅供参考。测试量表由“三角之外”设计，站点由
									{" "}
									<Link href="https://www.tnxg.top/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
										iykrzu
									</Link>
									{" "}
									与 AI 共同完成。
								</p>
								<p>
									特别鸣谢
									{" "}
									<Link href="https://yumetsuki.moe/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
										Q78KG
									</Link>
									{" "}
									提供的技术支持。想要体验更具
									{" "}
									<strong>趣味性</strong>
									{" "}
									的评价，请移步TA的
									{" "}
									<Link href="https://ink-battles.yumetsuki.moe/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
										Ink Battles
									</Link>
									。
								</p>
							</section>

							{/* 更新后的数据处理与服务条款部分 */}
							<section className="text-sm text-slate-600 space-y-3 dark:text-slate-300">
								<h3 className="text-base text-slate-700 font-semibold dark:text-slate-200">数据处理与服务条款</h3>
								<p>为了向您提供稳定、高效且安全的服务，我们需要处理以下类型的数据。我们致力于以最高标准保障您的隐私安全：</p>
								<ul className="pl-2 list-disc list-inside space-y-2">
									<li>
										<strong>原文内容：</strong>
										您的原文将通过行业标准加密后存储。我们郑重承诺，原文
										<strong className="text-blue-600 dark:text-blue-400">仅用于为您生成本次分析报告</strong>
										，绝不会被用于任何其他目的。
									</li>
									<li>
										<strong>缓存与标识：</strong>
										为了提升访问速度和重复查询效率，我们会缓存分析结果以及您文章的SHA-1哈希值（一种无法逆向还原的文本指纹）。
									</li>
									<li>
										<strong>安全信息：</strong>
										为保障服务安全、防止滥用，我们会收集您的IP地址和浏览器基本指纹信息。
									</li>
								</ul>
								<p className="pt-2">
									您在使用本服务即视为同意上述数据处理方式，并同意我们将相关数据提供给为本服务提供技术支持的第三方服务商（如AI模型提供方），以便其提供服务。我们不对第三方服务商的行为负责。
								</p>
							</section>
						</div>

						{/* 创作理念部分 */}
						<div className="text-sm text-slate-600 mt-10 p-6 border-l-4 border-blue-300 rounded-r-lg bg-slate-50/80 dark:text-slate-300 dark:border-blue-400/40 dark:bg-slate-800/50">
							<h3 className="text-slate-800 font-semibold mb-4 flex gap-2 items-center dark:text-slate-100">
								<PenTool className="h-4 w-4" />
								创作理念
							</h3>
							<div className="leading-relaxed space-y-3">
								<p className="text-slate-700 font-medium dark:text-slate-200">写你想写的，评你想评的！</p>
								<p>更多的提示词，更多的偏爱称号，更多的评价维度，由你创造。</p>
								<p className="italic">语言是认知的边界，也是奴役之锁——我们言说他者的语言，便成为他者的奴隶。语言是失败的，是尸体。</p>
								<p>可惜，你来晚了，实在界、象征界、想象界的博洛米绳结，已经松开了……</p>
								<p>无意识与【我们从哪来】的哲学议题就像是北冰洋，我们站在北冰洋上不断浮动的，大块的冰，猜测着冰的世界的距离和模样。</p>
								<p>冰块在变化——聚拢，凝固，融化，一切都是相对的标准，但我们却不得不从中探出一条路。</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

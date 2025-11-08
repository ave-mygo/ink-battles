import type { Metadata } from "next";
import { FileText, Info, PenTool } from "lucide-react"; // 引入新图标
import Link from "next/link";
import { FAQSection } from "@/components/seo/FAQSection";
import JsonLd from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buildFaqJsonLd, createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	return createPageMetadata({
		pathname: "/about",
		title: "关于我们",
		description: "了解作家战力分析系统的愿景、功能、服务条款与开源信息。基于AI技术为创作者提供专业文本分析服务。",
		keywords: [
			"作家战力分析",
			"AI文本分析",
			"关于我们",
			"服务条款",
			"开源协议",
			"写作工具",
			"创作辅助",
		],
	});
}

const faqItems = [
	{
		question: "AI会替代创作者吗？本系统的立场是什么？",
		answer: "我们深刻理解关于AI是否会替代创作者的担忧，但我们始终坚信，创作本质上是一种源自人类独特情感、思想和体验的表达方式，这些是机器无法复制的。AI技术虽然在处理大量信息、提供灵感拓展和优化语言表达上展现出强大能力，但它仅是辅助和工具的角色，而非创作者的替代者。\n本系统的定位是为创作者提供智能支持，帮助他们更高效地探索创意、发现写作盲点、提升作品质量。我们致力于通过数据驱动的分析和客观反馈，激发您的潜力，而非取代您的独特声音和主观判断。作品的灵魂与情感依然深植于您的内心，是AI无法复制的人类经验和创造精神。\n换言之，AI是您创作旅程中的“助力翅膀”，帮助您飞得更高、更远，而驾驶这架“飞机”的永远是您自己。我们希望通过技术赋能，让创作变得更轻松、有趣，同时保留并尊重创作者作为艺术家的核心地位。未来，AI与人类创作者的协作将创造更加丰富、多样的文化表达，而非单方面的替代与冲突。",
	},
	{
		question: "什么是作家战力分析系统？",
		answer: "作家战力分析系统（Ink Battles）是一个专业的AI文本分析平台，专为创作者设计。我们通过先进的AI技术提供多维度写作评估、内容质量打分、风格分析和创作建议，帮助作家提升创作水平。支持小说、文章、剧本等多种文体分析。",
	},
	{
		question: "如何开始使用系统？",
		answer: "使用流程非常简单：1) 在首页的文本框中输入或粘贴您的作品内容；2) 根据您的需求选择不同的评分模式和AI模型；3) 点击“开始分析”，系统会实时处理并展示分析结果；4) 在结果页查看详细的多维度分析报告和改进建议。",
	},
	{
		question: "我的数据安全如何保障？",
		answer: "我们高度重视您的数据安全与隐私。您提交的文本和分析结果会按照行业标准进行加密存储，以供您查阅历史记录。我们承诺不会将您的数据用于任何未经授权的用途。同时，分析过程会调用第三方AI服务，您的文本会经过我们和第三方服务商处理，详情请参阅我们的用户条款。",
	},
	{
		question: "分析的准确性如何？",
		answer: "我们的分析由多个先进的AI模型（如OpenAI、Google等）提供支持，力求提供专业、客观的反馈。但AI的判断并非绝对，分析结果仅供参考。我们强烈建议您将AI报告作为创作的辅助工具，并结合自身的经验和判断来使用。",
	},
	{
		question: "系统提供哪些分析模式？",
		answer: "我们提供多种预设的分析模式，例如“整体质量评估”、“写作风格分析”、“情感倾向识别”等，以满足不同场景的需求。您可以在“评分模式”区域自由组合，定制最适合您的分析视角。",
	},
	{
		question: "用户权限和会员服务有什么区别？",
		answer: "我们为不同用户提供分级服务：游客有基础的分析字数和次数限制；注册用户可以获得更高的免费额度并保存历史记录；赞助成为会员后，您将享有几乎无限制的分析字数、调用高级AI模型的权限以及专属折扣。",
	},
	{
		question: "为什么部分高级功能或模型无法使用？",
		answer: "为了保证服务质量和可持续运营，部分高级AI模型或特定分析功能（如“AI内容鉴别”）仅对会员用户或在特定活动期间开放。我们也在不断开发和迭代新功能，敬请期待。",
	},
	{
		question: "项目是否开源？我该如何参与？",
		answer: "是的，本项目以BSL 1.1 + AGPL-3.0双重许可证开源。我们欢迎开发者进行学习、二次开发或贡献代码。您可以在非生产环境中免费使用。如果您希望参与贡献或反馈问题，可以通过GitHub提交Issue或加入我们的社区进行讨论。",
	},
	{
		question: "如何联系我们或获得技术支持？",
		answer: "如果您遇到任何问题或有功能建议，可以通过以下方式联系我们：1) 在我们GitHub仓库的Issues页面提交问题；2) 加入我们的官方QQ群（625618470）与其他用户和开发者交流。我们非常珍视用户的反馈。",
	},
];

export default function AboutPage() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			{/* FAQ JSON-LD Schema */}
			<JsonLd
				schema={buildFaqJsonLd(
					faqItems.map(item => ({
						question: item.question,
						answer: typeof item.answer === "string" ? item.answer : "",
					})),
				)}
			/>

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

						<Separator className="my-8 sm:my-10" />

						{/* FAQ Section */}
						<div className="mt-12">
							<FAQSection items={faqItems} />
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

							<Separator className="my-6 sm:my-8" />

							{/* 数据处理与服务条款部分 */}
							<section className="text-sm text-slate-600 space-y-3 dark:text-slate-300">
								<h3 className="text-base text-slate-700 font-semibold dark:text-slate-200">您的数据如何被处理（用户条款）</h3>
								<p>
									我们高度重视您的数据安全与隐私。对于注册用户，您提交的文本和生成的分析报告会
									<strong className="font-semibold">按照行业标准进行加密存储</strong>
									，以便您随时查阅历史记录。我们承诺不会将您的个人数据用于任何未经授权的用途。
								</p>
								<div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
									<h4 className="text-base text-slate-700 font-semibold dark:text-slate-200">关于第三方及中转服务的重要说明</h4>
									<p className="mt-2">
										本站的核心文本分析能力，是由专业的第三方AI公司（我们称之为“上游提供商”，如OpenAI、Google等）提供的。
									</p>
									<p className="mt-2">
										为了提供更丰富或稳定的模型选择，部分AI模型我们并非直接连接，而是通过另一家或多家“服务中转商”来调用。
									</p>
									<p className="mt-2">
										您可以将这个过程想象成一次国际快递：您把包裹（您的原文）交给我们，我们委托一家
										<strong className="text-blue-600 dark:text-blue-400">“物流中转公司”（服务中转商）</strong>
										，由它再将包裹交给最终的
										<strong className="text-blue-600 dark:text-blue-400">“国际快递员”（上游AI提供商）</strong>
										来完成分析和“投递”。
									</p>
									<p className="mt-2">
										这意味着，在使用这类模型时，您的原文会依次经过：
										<strong className="font-semibold">本站 -&gt; 服务中转商 -&gt; 上游AI提供商</strong>
										。
									</p>
									<p className="mt-2">
										<strong className="font-semibold">责任范围声明：</strong>
										我们承诺会选择信誉良好的合作伙伴，并在模型选择页面
										<strong className="underline underline-offset-2">清晰标注每个模型的来源</strong>
										，让您有充分的知情权。但请您理解，我们无法控制“服务中转商”和“上游AI提供商”的内部数据处理流程，因此
										<strong className="font-semibold">无法为这条链路上的任何第三方公司的行为承担任何责任</strong>
										。
									</p>
									<p className="mt-2">
										<strong className="font-semibold">您使用本服务，即表示您理解并同意上述数据处理方式</strong>
										，并同意我们将您的原文内容按需提供给服务中转商及上游AI提供商以完成分析。
									</p>
								</div>
							</section>

							{/* === 新增的开源协议部分 === */}
							<Separator className="my-6 sm:my-8" />

							<section className="text-sm text-slate-600 space-y-3 dark:text-slate-300">
								<h3 className="text-base text-slate-700 font-semibold flex gap-2 items-center dark:text-slate-200">
									<FileText className="h-4 w-4" />
									开源协议与许可证
								</h3>
								<p>
									本项目采用
									{" "}
									<strong>Business Source License 1.1 (BSL 1.1)</strong>
									。在变更日期到达后，整个项目将自动转为以
									{" "}
									<strong>GNU AGPL-3.0</strong>
									{" "}
									授权。
								</p>
								<div className="text-xs pl-4 space-y-1">
									<p>
										<strong className="text-slate-700 dark:text-slate-200">变更日期 (Change Date):</strong>
										{" "}
										2030-09-14
									</p>
									<p>
										<strong className="text-slate-700 dark:text-slate-200">变更后许可证 (Change License):</strong>
										{" "}
										AGPL-3.0
									</p>
								</div>

								<div className="p-4 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
									<h4 className="text-slate-700 font-semibold dark:text-slate-200">TL;DR (非法律文本，仅作速览)</h4>
									<ul className="mt-2 pl-4 list-disc list-inside space-y-1">
										<li>
											<strong>可免费用于：</strong>
											学习、开发、测试、预发布/演示等非生产环境。
										</li>
										<li>
											<strong>不可用于：</strong>
											向第三方提供以本项目为核心功能的 SaaS 或托管服务 (Managed Service)。
										</li>
										<li>如需将本项目作为对外提供服务的核心组件或进行商用，请联系作者/团队获取商业授权。</li>
										<li>到达变更日期后，项目将转为 AGPL-3.0，需遵守 AGPL 的网络使用条款（对外提供网络服务时需开放对应修改后的源代码）。</li>
									</ul>
								</div>

								<div className="pt-2">
									<h4 className="text-slate-700 font-semibold dark:text-slate-200">合规使用指引 (示例)</h4>
									<ul className="mt-2 pl-4 list-disc list-inside space-y-1">
										<li>
											<strong>内部自用部署 (公司/个人内部环境):</strong>
											{" "}
											允许。
										</li>
										<li>
											<strong>二次开发并在内部使用:</strong>
											{" "}
											允许。
										</li>
										<li>
											<strong>面向外部用户提供在线服务，且本项目提供核心功能:</strong>
											{" "}
											需要商业授权。
										</li>
										<li>
											<strong>变更日之后的使用:</strong>
											{" "}
											按 AGPL-3.0 执行 (对网络服务的源代码开放要求需特别注意)。
										</li>
									</ul>
								</div>
								<p className="pt-2">
									完整条款请参见项目仓库根目录的
									{" "}
									<code>LICENSE.md</code>
									{" "}
									文件。
								</p>
							</section>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

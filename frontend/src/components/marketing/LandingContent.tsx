/**
 * 首页营销内容 - 服务器端渲染
 * 为搜索引擎提供丰富的可索引内容
 */

import { BarChart3, BookOpen, Brain, Heart, Shield, Star, Target, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingContent() {
	return (
		<div className="mx-auto mb-12 px-4 container max-w-6xl">
			{/* 主标题区域 */}
			<section className="mb-16 text-center">
				<h1 className="text-4xl text-slate-900 font-bold mb-4 md:text-5xl dark:text-white">
					作家战力分析系统
				</h1>
				<p className="text-xl text-slate-600 mx-auto mb-6 max-w-3xl dark:text-slate-300">
					基于先进AI技术的专业文本分析工具，为创作者提供多维度写作评估、内容质量打分、风格分析等功能。
					支持小说、文章、剧本等多种文体，帮助作家提升创作水平。
				</p>
			</section>

			{/* 核心功能介绍 */}
			<section className="mb-16">
				<h2 className="text-3xl text-slate-900 font-bold mb-8 text-center dark:text-white">
					核心功能
				</h2>
				<div className="gap-6 grid lg:grid-cols-3 md:grid-cols-2">
					<Card>
						<CardHeader>
							<BarChart3 className="text-blue-600 mb-2 h-8 w-8" />
							<CardTitle>多维度战力评估</CardTitle>
							<CardDescription>
								从内容质量、语言表达、情节结构、人物塑造、情感深度等多个角度评估您的作品
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<Brain className="text-purple-600 mb-2 h-8 w-8" />
							<CardTitle>AI智能分析</CardTitle>
							<CardDescription>
								采用最新的大语言模型技术，包括 Gemini、Claude 等顶级AI，提供专业、客观的文本分析报告
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<Target className="text-green-600 mb-2 h-8 w-8" />
							<CardTitle>个性化建议</CardTitle>
							<CardDescription>
								基于分析结果，为您的创作提供具体、可操作的改进建议，助力写作水平提升
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<Star className="text-yellow-600 mb-2 h-8 w-8" />
							<CardTitle>可视化报告</CardTitle>
							<CardDescription>
								通过图表、评分和详细说明，让分析结果一目了然，快速定位优势与不足
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<Zap className="text-orange-600 mb-2 h-8 w-8" />
							<CardTitle>多文体支持</CardTitle>
							<CardDescription>
								无论是小说、散文、诗歌、剧本还是学术文章，我们都能提供专业的分析服务
							</CardDescription>
						</CardHeader>
					</Card>

					<Card>
						<CardHeader>
							<Shield className="text-red-600 mb-2 h-8 w-8" />
							<CardTitle>AI鉴别功能</CardTitle>
							<CardDescription>
								检测文本的AI生成特征，分析人类创作与AI辅助的混合程度，确保原创性
							</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</section>

			{/* 评分模式介绍 */}
			<section className="mb-16">
				<h2 className="text-3xl text-slate-900 font-bold mb-8 text-center dark:text-white">
					多种评分模式
				</h2>
				<div className="gap-6 grid md:grid-cols-2">
					<Card>
						<CardHeader>
							<BookOpen className="text-blue-600 mb-2 h-6 w-6" />
							<CardTitle>初窥门径</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								针对未出版或未获得公认的作品，设定合理的评分标准，帮助新手作者建立信心
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Target className="text-red-600 mb-2 h-6 w-6" />
							<CardTitle>严苛编辑</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								模拟保守出版行业的打分标准，适用于反向压力测试，帮助作者发现潜在问题
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Star className="text-yellow-600 mb-2 h-6 w-6" />
							<CardTitle>宽容读者</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								引导评分者主动放大作品优点，适用于创作初期鼓励，激发创作热情
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Brain className="text-purple-600 mb-2 h-6 w-6" />
							<CardTitle>文本法官</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								要求所有评分行为有文本证据支撑，适用于学术评价和专业文学批评
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Heart className="text-pink-600 mb-2 h-6 w-6" />
							<CardTitle>热血粉丝</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								允许用户在特殊情感偏好下突破原本的评分限制，适合偏爱型阅读分析
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Shield className="text-indigo-600 mb-2 h-6 w-6" />
							<CardTitle>AI鉴别师</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								专门检测和评估文本的AI生成特征，提供AI含量分析，确保作品原创性
							</p>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* 使用场景 */}
			<section className="mb-16">
				<h2 className="text-3xl text-slate-900 font-bold mb-8 text-center dark:text-white">
					适用场景
				</h2>
				<Card>
					<CardContent className="pt-6">
						<ul className="text-slate-700 space-y-3 dark:text-slate-300">
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">✓</span>
								<span>网络小说作者在发布前检查章节质量，提升读者满意度</span>
							</li>
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">✓</span>
								<span>学生评估作文和论文的写作水平，获得改进建议</span>
							</li>
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">✓</span>
								<span>编剧优化剧本对白和情节设计，增强戏剧张力</span>
							</li>
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">✓</span>
								<span>自媒体作者提升文章吸引力，提高阅读量和互动率</span>
							</li>
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">✓</span>
								<span>出版社编辑初步筛选稿件，提高审稿效率</span>
							</li>
							<li className="flex items-start">
								<span className="text-blue-600 mr-2">✓</span>
								<span>写作爱好者学习和提升技巧，系统化提升写作能力</span>
							</li>
						</ul>
					</CardContent>
				</Card>
			</section>

			{/* 使用步骤 */}
			<section className="mb-16">
				<h2 className="text-3xl text-slate-900 font-bold mb-8 text-center dark:text-white">
					如何使用
				</h2>
				<div className="gap-6 grid md:grid-cols-3">
					<Card>
						<CardHeader>
							<div className="mb-4 rounded-full bg-blue-100 flex h-12 w-12 items-center justify-center dark:bg-blue-900">
								<span className="text-2xl text-blue-600 font-bold dark:text-blue-300">1</span>
							</div>
							<CardTitle>输入文本</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								在文本框中粘贴或输入您想要分析的文章、小说章节或其他创作内容。系统支持各种文体和长度的文本。
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="mb-4 rounded-full bg-purple-100 flex h-12 w-12 items-center justify-center dark:bg-purple-900">
								<span className="text-2xl text-purple-600 font-bold dark:text-purple-300">2</span>
							</div>
							<CardTitle>选择模式</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								根据需求选择AI模型和分析维度。您可以选择单一维度或综合分析，也可以选择不同的评分模式。
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="mb-4 rounded-full bg-green-100 flex h-12 w-12 items-center justify-center dark:bg-green-900">
								<span className="text-2xl text-green-600 font-bold dark:text-green-300">3</span>
							</div>
							<CardTitle>获取报告</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-slate-600 dark:text-slate-300">
								AI将在几秒钟内完成分析，生成详细的评估报告，包括战力评分、优势分析、改进建议等内容。
							</p>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* 技术优势 */}
			<section>
				<h2 className="text-3xl text-slate-900 font-bold mb-8 text-center dark:text-white">
					为什么选择我们
				</h2>
				<Card>
					<CardContent className="pt-6">
						<div className="gap-6 grid md:grid-cols-2">
							<div>
								<h3 className="text-lg text-slate-900 font-semibold mb-3 dark:text-white">
									多模型支持
								</h3>
								<p className="text-slate-600 dark:text-slate-300">
									采用多个顶级AI模型（Gemini 3 Pro、Claude 4.5、GLM-4.6等），确保分析结果的准确性和多样性
								</p>
							</div>
							<div>
								<h3 className="text-lg text-slate-900 font-semibold mb-3 dark:text-white">
									完全免费
								</h3>
								<p className="text-slate-600 dark:text-slate-300">
									基础功能完全免费，让每个创作者都能享受AI技术带来的便利，无需担心费用问题
								</p>
							</div>
							<div>
								<h3 className="text-lg text-slate-900 font-semibold mb-3 dark:text-white">
									隐私保护
								</h3>
								<p className="text-slate-600 dark:text-slate-300">
									注重用户隐私，分析后的文本不会被永久保存，确保您的创作内容安全
								</p>
							</div>
							<div>
								<h3 className="text-lg text-slate-900 font-semibold mb-3 dark:text-white">
									持续更新
								</h3>
								<p className="text-slate-600 dark:text-slate-300">
									持续更新和优化，紧跟AI技术发展趋势，不断提升分析质量和用户体验
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

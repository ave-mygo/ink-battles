/**
 * SEO-friendly content component
 * 为搜索引擎提供丰富的上下文信息
 * 使用 noscript 标签确保内容对搜索引擎可见但不影响用户体验
 */

export function SEOContent() {
	return (
		<>
			{/* 对搜索引擎可见的内容 */}
			<noscript>
				<section className="mx-auto mb-12 px-4 container max-w-6xl">
					<h1 className="text-4xl text-slate-900 font-bold mb-4">
						作家战力分析系统 - AI驱动的专业写作分析工具
					</h1>

					<article className="text-slate-700 space-y-6">
						<section>
							<h2 className="text-2xl font-semibold mb-3">什么是作家战力分析系统？</h2>
							<p>
								作家战力分析系统是一个基于人工智能技术的文本分析平台，专为创作者设计。
								我们利用先进的AI模型，包括OpenAI的GPT系列、Google的Gemini、Anthropic的Claude等，
								为您的文学作品提供全方位、多维度的深度分析。
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-3">核心功能与特点</h2>
							<ul className="list-disc list-inside space-y-2">
								<li>
									<strong>多维度战力评估：</strong>
									从内容质量、语言表达、情节结构、人物塑造、情感深度等多个角度评估您的作品。
								</li>
								<li>
									<strong>AI智能分析：</strong>
									采用最新的大语言模型技术，提供专业、客观的文本分析报告。
								</li>
								<li>
									<strong>可视化报告：</strong>
									通过图表、评分和详细说明，让分析结果一目了然。
								</li>
								<li>
									<strong>个性化建议：</strong>
									基于分析结果，为您的创作提供具体、可操作的改进建议。
								</li>
								<li>
									<strong>自定义分析视角：</strong>
									支持自定义提示词，按照您的需求进行特定维度的分析。
								</li>
								<li>
									<strong>多文体支持：</strong>
									无论是小说、散文、诗歌、剧本还是学术文章，我们都能提供专业分析。
								</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-3">适用人群</h2>
							<p>
								本工具适合各类创作者使用，包括但不限于：
								网络小说作家、文学创作者、编剧、自媒体写手、学生、学术研究者、
								内容创作者、营销文案撰写者等任何需要提升写作质量的人士。
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-3">为什么选择我们？</h2>
							<ul className="list-disc list-inside space-y-2">
								<li>采用多个顶级AI模型，确保分析结果的准确性和多样性</li>
								<li>完全免费的基础功能，让每个创作者都能享受AI技术带来的便利</li>
								<li>注重用户隐私，分析后的文本不会被永久保存</li>
								<li>持续更新和优化，紧跟AI技术发展趋势</li>
								<li>友好的用户界面，简单三步即可完成分析</li>
								<li>开源项目，透明可信</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-3">如何使用作家战力分析系统</h2>
							<ol className="list-decimal list-inside space-y-2">
								<li>
									<strong>第一步：输入文本</strong>
									{" "}
									-
									在文本输入框中粘贴或直接输入您想要分析的作品内容。支持长文本，
									建议每次分析不少于500字以获得更准确的结果。
								</li>
								<li>
									<strong>第二步：选择分析模式</strong>
									{" "}
									-
									根据您的需求选择合适的AI模型和分析维度。您可以选择综合评估，
									也可以针对特定方面进行深入分析。
								</li>
								<li>
									<strong>第三步：获取分析报告</strong>
									{" "}
									-
									点击分析按钮后，AI将在几秒钟内完成分析，为您生成详细的评估报告，
									包括评分、优势分析、不足之处以及改进建议。
								</li>
							</ol>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-3">常见应用场景</h2>
							<ul className="list-disc list-inside space-y-2">
								<li>网络小说作者在发布前检查章节质量</li>
								<li>学生评估作文和论文的写作水平</li>
								<li>编剧优化剧本对白和情节设计</li>
								<li>自媒体作者提升文章吸引力</li>
								<li>出版社编辑初步筛选稿件</li>
								<li>写作爱好者学习和提升技巧</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-3">关于数据安全与隐私</h2>
							<p>
								我们非常重视用户的数据安全和隐私保护。您提交的文本仅用于生成分析报告，
								分析完成后会立即删除，不会被永久存储或用于其他目的。
								在使用第三方AI服务时，您的文本会经过加密传输到相应的AI提供商。
							</p>
						</section>
					</article>

					<aside className="mt-6">
						<h3 className="text-lg font-semibold mb-2">相关关键词</h3>
						<p className="text-sm text-slate-600">
							AI写作助手, 文本分析工具, 写作质量评估, 小说分析, 作文评分,
							AI评分系统, 创作辅助工具, 文学分析, 内容质量检测, 写作建议,
							AI文本评估, 智能写作分析, 作家工具, 文本质量打分, 创意写作辅助
						</p>
					</aside>
				</section>
			</noscript>
		</>
	);
}

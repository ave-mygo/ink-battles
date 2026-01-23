import type { Metadata } from "next";

import { NoticeBar } from "@/components/common/notice-bar";
import WriterAnalysisSystem from "@/components/layouts";
import JsonLd from "@/components/seo/JsonLd";
import { SEOContent } from "@/components/seo/SEOContent";
import { getAvailableGradingModels, getConfig } from "@/config";
import {
	buildArticleJsonLd,
	buildHowToJsonLd,
	buildSoftwareApplicationJsonLd,
	createPageMetadata,
	getSiteUrl,
} from "@/lib/seo";

// 动态渲染，确保每次都读取最新的 config.toml
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	return createPageMetadata({
		pathname: "/",
		title: "%s | 作家战力分析系统",
		default: "作家战力分析系统",
		description:
			"专业的AI文本分析平台，为创作者提供多维度写作评估、内容质量打分、风格分析和创作建议。支持小说、文章、剧本等多种文体，帮助作家提升创作水平。免费在线使用。",
		keywords: [
			"写作分析",
			"AI评分",
			"内容质量",
			"文本优化",
			"作家战力",
			"AI写作助手",
			"文本分析工具",
			"写作评估",
			"创作辅助",
			"小说分析",
			"文章评分",
			"写作质量检测",
		],
	});
}

export default async function Home() {
	const noticeConf = getConfig().app.notice;
	const siteUrl = getSiteUrl();
	// 在服务器端获取评分模型配置，传递给客户端组件
	const availableGradingModels = getAvailableGradingModels().map(model => ({
		id: model.id ?? model.model,
		name: model.name,
		model: model.model,
		description: model.description,
		enabled: model.enabled,
		premium: model.premium,
		features: model.features,
		advantages: model.advantages,
		usageScenario: model.usageScenario,
		warning: model.warning,
	}));

	return (
		<>
			{noticeConf.enabled && (
				<NoticeBar message={noticeConf.content} link={noticeConf.link} />
			)}

			{/* SEO-friendly hidden content for AI crawlers */}
			<SEOContent />

			{/* SoftwareApplication Schema - 帮助 AI 理解这是一个应用工具 */}
			<JsonLd schema={buildSoftwareApplicationJsonLd()} />

			{/* Article Schema - 提供内容背景 */}
			<JsonLd
				schema={buildArticleJsonLd({
					url: `${siteUrl}/`,
					headline: "作家战力分析系统 - AI驱动的专业写作分析工具",
					description:
						"利用先进的人工智能技术，为创作者提供全方位的文本分析服务。通过多维度评估系统，深入分析写作风格、内容质量、语言表达等关键要素，为作家提供可操作的改进建议，助力创作水平提升。",
					datePublished: "2024-01-01T00:00:00Z",
					dateModified: new Date().toISOString(),
				})}
			/>

			{/* HowTo Schema - 帮助 AI 理解使用方式 */}
			<JsonLd
				schema={buildHowToJsonLd({
					name: "如何使用作家战力分析系统",
					description: "快速上手作家战力分析系统，三步获得专业的文本分析报告",
					steps: [
						{
							name: "输入文本",
							text: "在文本框中粘贴或输入您想要分析的文章、小说章节或其他创作内容。系统支持各种文体和长度的文本。",
						},
						{
							name: "选择分析维度",
							text: "根据需求选择分析维度，如整体质量评估、风格分析、情感倾向等。您可以选择单一维度或综合分析。",
						},
						{
							name: "查看分析结果",
							text: "系统将使用AI技术快速分析文本，生成详细的评估报告，包括战力评分、优势分析、改进建议等内容。",
						},
					],
				})}
			/>

			<WriterAnalysisSystem availableGradingModels={availableGradingModels} />
		</>
	);
}

import { getSiteUrl } from "@/lib/seo";

export default function robots() {
	const base = getSiteUrl();
	return {
		rules: [
			// 通用爬虫规则
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/api/", "/dashboard/"],
			},
			// 针对主流 AI 搜索引擎的优化（确保它们能正确索引）
			{
				userAgent: [
					"GPTBot", // OpenAI
					"ChatGPT-User", // ChatGPT
					"Google-Extended", // Google Bard/Gemini
					"anthropic-ai", // Claude
					"Claude-Web", // Claude
					"PerplexityBot", // Perplexity
					"Bytespider", // 字节跳动
					"Applebot-Extended", // Apple Intelligence
				],
				allow: "/",
				disallow: ["/api/", "/dashboard/"],
			},
		],
		sitemap: `${base}/sitemap.xml`,
	};
}

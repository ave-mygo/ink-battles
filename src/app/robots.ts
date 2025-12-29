import type { MetadataRoute } from "next";
import process from "node:process";
import { getSiteUrl } from "@/lib/seo";

/**
 * 动态生成 robots.txt
 * 根据环境自动配置搜索引擎爬取规则
 *
 * 使用动态渲染确保 URL 不会在构建时固定为 localhost
 */
export const revalidate = 600; // 10 分钟

export default function robots(): MetadataRoute.Robots {
	const siteUrl = getSiteUrl();
	const isProduction = process.env.NODE_ENV === "production";

	return {
		rules: [
			{
				userAgent: "*",
				allow: ["/", "/about", "/sponsors", "/share/"],
				disallow: [
					"/api/",
					"/_next/",
					"/*.json$",
					"/admin/",
				],
				// 生产环境允许爬取，开发环境禁止
				...(isProduction ? {} : { disallow: "/" }),
			},
			// Google 爬虫优化
			{
				userAgent: "Googlebot",
				allow: "/",
				disallow: ["/api/", "/_next/"],
				crawlDelay: 0,
			},
			// 百度爬虫优化
			{
				userAgent: "Baiduspider",
				allow: "/",
				disallow: ["/api/", "/_next/"],
				crawlDelay: 1,
			},
			// Bing 爬虫优化
			{
				userAgent: "Bingbot",
				allow: "/",
				disallow: ["/api/", "/_next/"],
				crawlDelay: 0,
			},
		],
		sitemap: `${siteUrl}/sitemap.xml`,
		host: siteUrl,
	};
}

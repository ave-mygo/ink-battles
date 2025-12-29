import type { MetadataRoute } from "next";
import { createCanonical } from "@/lib/seo";
import { getPublicRecordsForSitemap } from "@/utils/dashboard";

/**
 * ISR 重新验证时间（秒）
 * 每 10 分钟重新生成一次 sitemap，确保动态内容及时更新
 */
export const revalidate = 600;

/**
 * 生成网站 sitemap
 * 包含静态页面和动态的公开分享页面
 * 使用 ISR 确保在构建后也能更新
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const now = new Date().toISOString();

	// 静态路由
	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: createCanonical("/"), lastModified: now, changeFrequency: "hourly", priority: 1.0 },
		{ url: createCanonical("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
		{ url: createCanonical("/signin"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
		{ url: createCanonical("/signup"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
		{ url: createCanonical("/sponsors"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
	];

	// 动态路由：公开分享页面
	try {
		const publicRecords = await getPublicRecordsForSitemap();
		const shareRoutes: MetadataRoute.Sitemap = publicRecords.map(record => ({
			url: createCanonical(`/share/${record.id}`),
			lastModified: new Date(record.lastModified).toISOString(),
			changeFrequency: "weekly",
			priority: 0.6,
		}));

		return [...staticRoutes, ...shareRoutes];
	} catch (error) {
		console.error("生成 sitemap 时获取公开记录失败:", error);
		// 如果获取动态路由失败，至少返回静态路由
		return staticRoutes;
	}
}

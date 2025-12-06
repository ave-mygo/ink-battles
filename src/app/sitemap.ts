import type { MetadataRoute } from "next";
import { createCanonical } from "@/lib/seo";
import { getPublicRecordsForSitemap } from "@/utils/dashboard";

/**
 * ISR 重新验证时间（秒）
 * 每小时重新生成一次 sitemap
 */
export const revalidate = 3600;

/**
 * 生成网站 sitemap
 * 包含静态页面和动态的公开分享页面
 * 使用 ISR 确保在构建后也能更新
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const now = new Date().toISOString();

	// 静态路由
	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: createCanonical("/"), lastModified: now, changeFrequency: "daily", priority: 1.0 },
		{ url: createCanonical("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
		{ url: createCanonical("/signin"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
		{ url: createCanonical("/signup"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
		{ url: createCanonical("/sponsors"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
	];

	// 动态路由：公开分享页面
	const publicRecords = await getPublicRecordsForSitemap();
	const shareRoutes: MetadataRoute.Sitemap = publicRecords.map(record => ({
		url: createCanonical(`/share/${record.id}`),
		lastModified: new Date(record.lastModified).toISOString(),
		changeFrequency: "monthly",
		priority: 0.5,
	}));

	return [...staticRoutes, ...shareRoutes];
}

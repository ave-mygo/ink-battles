import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { getPublicRecordsForSitemap } from "@/utils/dashboard";

/**
 * 生成网站 sitemap
 * 包含静态页面和动态的公开分享页面
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = getSiteUrl();
	const now = new Date().toISOString();

	// 静态路由
	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
		{ url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
		{ url: `${base}/signin`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
		{ url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
		{ url: `${base}/sponsors`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
	];

	// 动态路由：公开分享页面
	const publicRecords = await getPublicRecordsForSitemap();
	const shareRoutes: MetadataRoute.Sitemap = publicRecords.map(record => ({
		url: `${base}/share/${record.id}`,
		lastModified: new Date(record.lastModified).toISOString(),
		changeFrequency: "monthly",
		priority: 0.5,
	}));

	return [...staticRoutes, ...shareRoutes];
}

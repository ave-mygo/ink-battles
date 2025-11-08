import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

// TODO: 动态内容（例如 /feed, /dashboard 子页面, /sponsors 列表）可在此扩展
export default function sitemap(): MetadataRoute.Sitemap {
	const base = getSiteUrl();
	const now = new Date().toISOString();
	const routes: Array<{ url: string; lastModified: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }> = [
		{ url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
		{ url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
		{ url: `${base}/signin`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
		{ url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
		{ url: `${base}/sponsors`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
	];
	return routes;
}

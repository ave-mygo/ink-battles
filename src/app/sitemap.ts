import type { MetadataRoute } from "next";
import { createCanonical } from "@/lib/seo";

export const dynamic = "force-dynamic";

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

	return staticRoutes;
}

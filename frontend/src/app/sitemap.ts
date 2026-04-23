import type { SharedHistorySitemapResult } from "@ink-battles/shared/types/common/history";
import type { MetadataRoute } from "next";
import { createCanonical } from "@/lib/seo";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

export const dynamic = "force-dynamic";

/**
 * 生成站点地图。
 *
 * 这里必须把所有公开分享页一并纳入。
 * 如果公开分享列表加载失败，就直接抛错而不是静默降级为空数组，
 * 否则问题会被掩盖，最终表现成 sitemap 里只有静态页。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const now = new Date().toISOString();
	const api = await createServerEden();

	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: createCanonical("/"), lastModified: now, changeFrequency: "hourly", priority: 1.0 },
		{ url: createCanonical("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
		{ url: createCanonical("/signin"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
		{ url: createCanonical("/signup"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
		{ url: createCanonical("/sponsors"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
	];

	const sharedRecordsResponse = await api.api.v2.analysis["public-share-sitemap"].get();
	const sharedRecordsResult = await normalizeEdenResult<SharedHistorySitemapResult>(
		sharedRecordsResponse.data,
		sharedRecordsResponse.error,
		"加载公开分享 sitemap 失败",
	);

	if (!sharedRecordsResult.success || !sharedRecordsResult.data) {
		throw new Error(sharedRecordsResult.message || "加载公开分享 sitemap 失败");
	}

	const sharedRoutes: MetadataRoute.Sitemap = sharedRecordsResult.data.records.map(record => ({
		url: createCanonical(`/share/${record.id}`),
		lastModified: record.lastModified,
		changeFrequency: "weekly",
		priority: 0.6,
	}));

	return [...staticRoutes, ...sharedRoutes];
}

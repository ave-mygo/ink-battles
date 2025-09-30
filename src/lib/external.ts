import type { JinaSearchResponse } from "@/types/callback/external";

import { getSystemModel } from "@/config";

/**
 * 通过互联网获取作品的经典性相关资料
 */
export const searchWebFromJina = async (tags: string[]): Promise<JinaSearchResponse | null> => {
	const query = encodeURIComponent(tags.join(" "));
	const searchModelConf = getSystemModel("search");
	if (!searchModelConf) {
		return null;
	}
	try {
		const queryUrl = `${searchModelConf.base_url}/?q=${encodeURIComponent(query)}&gl=CN&location=Shanghai&hl=zh-cn`;
		const headers = {
			"Accept": "application/json",
			"Content-Type": "application/json",
			"Authorization": `Bearer ${searchModelConf.api_key}`,
		};
		const response = await fetch(queryUrl, { headers });
		const data: JinaSearchResponse = await response.json();
		return data;
	} catch (error) {
		console.error("Error fetching search results:", error);
		return null;
	}
};

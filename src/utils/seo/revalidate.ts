import process from "node:process";
/**
 * SEO 重新验证工具函数
 * 用于在内容更新时触发 sitemap 和页面缓存的重新生成
 */

import "server-only";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "ink-battles-revalidate-secret-2024";

interface RevalidateOptions {
	path?: string;
	tag?: string;
}

/**
 * 触发按需重新验证
 * @param options - 重新验证选项
 * @returns 是否成功
 */
export async function triggerRevalidate(options: RevalidateOptions = {}): Promise<boolean> {
	try {
		// 在开发环境中跳过
		if (process.env.NODE_ENV === "development") {
			console.log("⚠️ 开发环境跳过重新验证");
			return true;
		}

		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
		const response = await fetch(`${baseUrl}/api/revalidate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				secret: REVALIDATE_SECRET,
				...options,
			}),
		});

		if (!response.ok) {
			console.error("重新验证失败:", await response.text());
			return false;
		}

		const result = await response.json();
		console.log("✅ 重新验证成功:", result.message);
		return true;
	} catch (error) {
		console.error("触发重新验证时出错:", error);
		return false;
	}
}

/**
 * 当创建或更新公开分享时调用
 * 自动更新 sitemap
 */
export async function revalidateOnShareUpdate(shareId?: string): Promise<void> {
	// 重新验证 sitemap
	await triggerRevalidate({ path: "/sitemap.xml" });

	// 如果提供了 shareId，也重新验证该分享页面
	if (shareId) {
		await triggerRevalidate({ path: `/share/${shareId}` });
	}
}

/**
 * 当删除公开分享时调用
 */
export async function revalidateOnShareDelete(): Promise<void> {
	// 重新验证 sitemap
	await triggerRevalidate({ path: "/sitemap.xml" });
}

/**
 * 批量重新验证多个路径
 */
export async function revalidateMultiplePaths(paths: string[]): Promise<void> {
	for (const path of paths) {
		await triggerRevalidate({ path });
	}
}

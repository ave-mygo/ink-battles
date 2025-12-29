import type { NextRequest } from "next/server";
import process from "node:process";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * 按需重新验证 API
 * 用于在内容更新时立即刷新缓存
 *
 * 使用方法：
 * POST /api/revalidate
 * Body: {
 *   secret: "your-secret-token",
 *   path?: "/sitemap.xml" | "/" | "/share/[id]",
 *   tag?: "sitemap" | "share"
 * }
 */

// 从环境变量或配置中获取密钥
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || "ink-battles-revalidate-secret-2024";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { secret, path, tag } = body;

		// 验证密钥
		if (secret !== REVALIDATE_SECRET) {
			return NextResponse.json(
				{ error: "Invalid secret token" },
				{ status: 401 },
			);
		}

		// 按路径重新验证
		if (path) {
			revalidatePath(path, "page");
			console.log(`✅ 已重新验证路径: ${path}`);
			return NextResponse.json({
				success: true,
				message: `Revalidated path: ${path}`,
				timestamp: new Date().toISOString(),
			});
		}

		// 按标签重新验证
		if (tag) {
			revalidateTag(tag, "page");
			console.log(`✅ 已重新验证标签: ${tag}`);
			return NextResponse.json({
				success: true,
				message: `Revalidated tag: ${tag}`,
				timestamp: new Date().toISOString(),
			});
		}

		// 如果没有指定路径或标签，默认重新验证 sitemap
		revalidatePath("/sitemap.xml", "page");
		revalidatePath("/", "page");
		console.log("✅ 已重新验证 sitemap 和首页");

		return NextResponse.json({
			success: true,
			message: "Revalidated sitemap and homepage",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("重新验证失败:", error);
		return NextResponse.json(
			{
				error: "Revalidation failed",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// 支持 GET 请求用于测试
export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const secret = searchParams.get("secret");

	if (secret !== REVALIDATE_SECRET) {
		return NextResponse.json(
			{ error: "Invalid secret token" },
			{ status: 401 },
		);
	}

	return NextResponse.json({
		message: "Revalidate API is working",
		usage: {
			method: "POST",
			body: {
				secret: "your-secret-token",
				path: "/sitemap.xml (optional)",
				tag: "sitemap (optional)",
			},
		},
		timestamp: new Date().toISOString(),
	});
}

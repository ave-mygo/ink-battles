import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db_name } from "@/lib/constants";
import { db_find } from "@/lib/db";

/**
 * 获取session的搜索信息
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { session } = body;

		console.log(`[get-search-info] 收到请求，session: ${session}`);

		if (!session) {
			console.log(`[get-search-info] 缺少session参数`);
			return NextResponse.json(
				{ error: "缺少session参数" },
				{ status: 400 },
			);
		}

		// 从数据库查询session记录
		const sessionRecord = await db_find(db_name, "sessions", { session });

		if (!sessionRecord) {
			console.log(`[get-search-info] 未找到session记录: ${session}`);
			return NextResponse.json(
				{ error: "未找到session记录" },
				{ status: 404 },
			);
		}

		console.log(`[get-search-info] 找到session记录，searchResults: ${!!sessionRecord.searchResults}, searchWebPages: ${!!sessionRecord.searchWebPages}`);

		// 返回搜索信息
		return NextResponse.json({
			searchResults: sessionRecord.searchResults || null,
			searchWebPages: sessionRecord.searchWebPages || null,
		});
	} catch (error) {
		console.error("[get-search-info] 获取搜索信息失败:", error);
		return NextResponse.json(
			{ error: "获取搜索信息失败" },
			{ status: 500 },
		);
	}
}

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

		if (!session) {
			return NextResponse.json(
				{ error: "缺少session参数" },
				{ status: 400 },
			);
		}

		// 从数据库查询session记录
		const sessionRecord = await db_find(db_name, "sessions", { session });

		if (!sessionRecord) {
			return NextResponse.json(
				{ error: "未找到session记录" },
				{ status: 404 },
			);
		}

		// 返回搜索信息
		return NextResponse.json({
			searchResults: sessionRecord.searchResults || null,
			searchWebPages: sessionRecord.searchWebPages || null,
		});
	} catch (error) {
		console.error("获取搜索信息失败:", error);
		return NextResponse.json(
			{ error: "获取搜索信息失败" },
			{ status: 500 },
		);
	}
}

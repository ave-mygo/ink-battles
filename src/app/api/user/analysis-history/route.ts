import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getAnalysisHistory } from "@/lib/analysis-history";

export async function GET(request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const token = cookieStore.get("auth-token")?.value;

		if (!token) {
			return Response.json({ error: "未登录" }, { status: 401 });
		}

		// 从查询参数获取分页信息
		const searchParams = request.nextUrl.searchParams;
		const page = Number.parseInt(searchParams.get("page") || "1", 10);
		const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

		const response = await getAnalysisHistory(token, page, limit);
		return Response.json(response);
	} catch (error) {
		console.error("获取分析历史失败:", error);
		const message = error instanceof Error ? error.message : "获取历史记录失败";
		return Response.json(
			{ error: message },
			{ status: 500 },
		);
	}
}

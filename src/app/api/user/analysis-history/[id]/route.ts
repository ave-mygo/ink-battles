import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getAnalysisById } from "@/lib/analysis-history";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const cookieStore = await cookies();
		const token = cookieStore.get("auth-token")?.value;
		if (!token) {
			return Response.json({ error: "未登录" }, { status: 401 });
		}

		const { id } = await params;
		const detail = await getAnalysisById(token, id);
		return Response.json(detail);
	} catch (error) {
		console.error("获取分析详情失败:", error);
		const message = error instanceof Error ? error.message : "获取详情失败";
		return Response.json({ error: message }, { status: 500 });
	}
}

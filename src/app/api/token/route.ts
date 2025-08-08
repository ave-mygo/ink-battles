import { NextResponse } from "next/server";

/**
 * POST /api/token (已下线)
 * 通过账号系统替代 Token 体系
 */
export async function POST() {
	return NextResponse.json({ error: "Token 接口已下线" }, { status: 410 });
}

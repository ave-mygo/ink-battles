import { NextResponse } from "next/server";

/**
 * 获取客户端IP地址
 */
// 旧 Token 验证已下线

/**
 * POST /api/validate-token (已下线)
 * 账号系统已替代 Token 校验
 */
export async function POST() {
	return NextResponse.json({ valid: false, reason: "Token 验证已下线" }, { status: 410 });
}

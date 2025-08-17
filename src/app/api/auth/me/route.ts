import { NextResponse } from "next/server";
import { getCurrentUserEmail } from "@/utils/auth-server";

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
export async function GET() {
	try {
		const email = await getCurrentUserEmail();

		if (!email) {
			return NextResponse.json({ error: "未登录" }, { status: 401 });
		}

		return NextResponse.json({
			email,
			isLoggedIn: true,
		});
	} catch (error) {
		console.error("获取用户信息失败:", error);
		return NextResponse.json({ error: "服务器错误" }, { status: 500 });
	}
}

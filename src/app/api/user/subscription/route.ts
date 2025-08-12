import type { NextRequest } from "next/server";
import process from "node:process";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getUserSubscriptionData } from "@/lib/subscription";

export async function GET(request: NextRequest) {
	const token = request.cookies.get("auth-token")?.value;
	if (!token) {
		return NextResponse.json({ error: "未授权" }, { status: 401 });
	}

	try {
		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			return NextResponse.json({ error: "无效的令牌" }, { status: 401 });
		}

		// 使用统一的函数获取用户订阅数据
		const data = await getUserSubscriptionData(userEmail);

		return NextResponse.json(data);
	} catch (error) {
		console.error("获取用户订阅信息失败:", error);
		return NextResponse.json({ error: "获取订阅信息失败" }, { status: 500 });
	}
}

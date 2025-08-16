import process from "node:process";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BindEmailToQQ } from "@/lib/utils-server";

export async function POST(req: Request) {
	try {
		const { email, password } = await req.json();

		if (!email || !password) {
			return NextResponse.json(
				{ success: false, message: "邮箱和密码不能为空" },
				{ status: 400 },
			);
		}

		// 从JWT中获取QQ OpenID
		const cookieStore = await cookies();
		const token = cookieStore.get("auth-token")?.value;

		if (!token) {
			return NextResponse.json(
				{ success: false, message: "用户未登录" },
				{ status: 401 },
			);
		}

		try {
			const secret = process.env.JWT_SECRET || "dev_secret_change_me";
			const payload = jwt.verify(token, secret) as { qqOpenid?: string };

			if (!payload.qqOpenid) {
				return NextResponse.json(
					{ success: false, message: "非QQ登录用户" },
					{ status: 400 },
				);
			}

			const result = await BindEmailToQQ(payload.qqOpenid, email, password);

			if (result.success) {
				return NextResponse.json({
					success: true,
					message: result.message,
				});
			} else {
				return NextResponse.json(
					{ success: false, message: result.message },
					{ status: 400 },
				);
			}
		} catch (_jwtError) {
			return NextResponse.json(
				{ success: false, message: "无效的登录状态" },
				{ status: 401 },
			);
		}
	} catch (error) {
		console.error("邮箱绑定API错误:", error);
		return NextResponse.json(
			{ success: false, message: "服务器内部错误" },
			{ status: 500 },
		);
	}
}

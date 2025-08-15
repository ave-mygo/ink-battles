import { NextResponse } from "next/server";
import { BindQQToEmail, getCurrentUserEmail } from "@/lib/utils-server";

export async function POST(req: Request) {
	try {
		const { code } = await req.json();

		if (!code) {
			return NextResponse.json(
				{ success: false, message: "缺少授权码" },
				{ status: 400 },
			);
		}

		// 获取当前登录用户的邮箱
		const email = await getCurrentUserEmail();
		if (!email) {
			return NextResponse.json(
				{ success: false, message: "用户未登录" },
				{ status: 401 },
			);
		}

		const result = await BindQQToEmail(email, code);

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
	} catch (error) {
		console.error("QQ绑定API错误:", error);
		return NextResponse.json(
			{ success: false, message: "服务器内部错误" },
			{ status: 500 },
		);
	}
}

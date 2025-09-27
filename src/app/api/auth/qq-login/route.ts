import { NextResponse } from "next/server";
import { LoginWithQQ } from "@/utils/auth";

export async function POST(req: Request) {
	try {
		const { code } = await req.json();

		console.log("收到QQ登录请求，授权码:", code);

		if (!code) {
			return NextResponse.json(
				{ success: false, message: "缺少授权码" },
				{ status: 400 },
			);
		}

		const result = await LoginWithQQ(code);

		if (result.success) {
			return NextResponse.json({
				success: true,
				message: result.message,
				userInfo: result.userInfo,
			});
		} else {
			return NextResponse.json(
				{ success: false, message: result.message },
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error("QQ登录API错误:", error);
		return NextResponse.json(
			{ success: false, message: "服务器内部错误" },
			{ status: 500 },
		);
	}
}

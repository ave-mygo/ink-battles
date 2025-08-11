import type { NextRequest } from "next/server";
import process from "node:process";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { db_name } from "@/lib/constants";
import { db_find, db_update } from "@/lib/db";

export async function POST(request: NextRequest) {
	try {
		const token = request.cookies.get("auth-token")?.value;
		if (!token) {
			return NextResponse.json({ error: "未授权" }, { status: 401 });
		}

		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			return NextResponse.json({ error: "无效的令牌" }, { status: 401 });
		}

		// 通过邮箱查找用户
		const user = await db_find(db_name, "users", { email: userEmail });
		if (!user) {
			return NextResponse.json({ error: "用户不存在" }, { status: 404 });
		}

		const { action } = await request.json();

		if (action === "unbind_afdian") {
			// 解绑爱发电
			if (!user.afdian_user_id) {
				return NextResponse.json({ error: "未绑定爱发电账号" }, { status: 400 });
			}

			await db_update(
				db_name,
				"users",
				{ _id: user._id },
				{
					$unset: {
						afdian_user_id: "",
						afdian_username: "",
						afdian_avatar: "",
						afdian_access_token: "",
						afdian_refresh_token: "",
					},
					updated_at: new Date(),
				},
			);

			return NextResponse.json({
				success: true,
				message: "爱发电账号已解绑",
			});
		}

		return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
	} catch (error) {
		console.error("账号绑定操作失败:", error);
		return NextResponse.json({ error: "操作失败" }, { status: 500 });
	}
}

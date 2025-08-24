import type { NextRequest } from "next/server";
import process from "node:process";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { db_name } from "@/lib/constants";
import { db_find, db_insert, db_update } from "@/lib/db";

const AFDIAN_CLIENT_ID = process.env.AFDIAN_CLIENT_ID;
const AFDIAN_CLIENT_SECRET = process.env.AFDIAN_CLIENT_SECRET;

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");

	if (!code) {
		return NextResponse.json({ error: "缺少授权码" }, { status: 400 });
	}

	if (!state) {
		return NextResponse.json({ error: "缺少state参数" }, { status: 400 });
	}

	// 验证state参数防止CSRF攻击
	// 注意：这里简化处理，生产环境应该从session或数据库验证state
	if (!state.match(/^\d+$/)) {
		return NextResponse.json({ error: "无效的state参数" }, { status: 400 });
	}

	try {
		// 动态构建重定向URI，优先使用环境变量（适配Docker环境）
		const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
		const redirectUri = `${baseUrl}/api/oauth/afdian`;

		// 获取访问令牌 - 尝试token端点
		const tokenResponse = await fetch("https://afdian.com/api/oauth2/access_token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: AFDIAN_CLIENT_ID!,
				client_secret: AFDIAN_CLIENT_SECRET!,
				redirect_uri: redirectUri,
				code,
			}),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error("爱发电令牌获取失败:", {
				status: tokenResponse.status,
				statusText: tokenResponse.statusText,
				error: errorText,
				redirect_uri: redirectUri,
				client_id: AFDIAN_CLIENT_ID,
				code: `${code?.substring(0, 20)}...`,
			});
			throw new Error(`获取访问令牌失败: ${tokenResponse.status} ${errorText}`);
		}

		const tokenData = await tokenResponse.json();

		// 检查爱发电API响应格式
		if (tokenData.ec !== 200) {
			throw new Error(`爱发电API返回错误: ${tokenData.em || "未知错误"}`);
		}

		const afdianUser = tokenData.data;

		// 检查用户是否已登录（绑定场景）
		const authCookie = request.headers.get("cookie");
		let existingUserEmail: string | null = null;

		if (authCookie) {
			try {
				// 从cookie获取JWT token
				const authTokenMatch = authCookie.match(/auth-token=([^;]+)/);
				if (authTokenMatch) {
					const jwtToken = authTokenMatch[1];
					const secret = process.env.JWT_SECRET || "dev_secret_change_me";
					const payload = jwt.verify(jwtToken, secret) as { email?: string };
					existingUserEmail = payload.email || null;
				}
			} catch (error) {
				console.error("无法验证现有JWT:", error);
			}
		}

		// 检查爱发电用户是否已存在
		let user = await db_find(db_name, "users", { afdian_user_id: afdianUser.user_id });

		if (existingUserEmail && !user) {
			// 绑定场景：现有邮箱用户绑定爱发电
			const existingUser = await db_find(db_name, "users", { email: existingUserEmail });
			if (existingUser) {
				await db_update(
					db_name,
					"users",
					{ email: existingUserEmail },
					{
						afdian_user_id: afdianUser.user_id,
						afdian_username: afdianUser.name,
						afdian_avatar: afdianUser.avatar,
						updated_at: new Date(),
					},
				);
				user = { ...existingUser, afdian_user_id: afdianUser.user_id };
			}
		} else if (user && existingUserEmail && user.email !== existingUserEmail) {
			// 冲突场景：爱发电账号已绑定其他用户
			return NextResponse.json({
				error: "该爱发电账号已绑定其他用户",
			}, { status: 409 });
		} else {
			// 更新现有用户的信息
			await db_update(
				db_name,
				"users",
				{ afdian_user_id: afdianUser.user_id },
				{
					afdian_username: afdianUser.name,
					afdian_avatar: afdianUser.avatar,
					updated_at: new Date(),
				},
			);
			user = { ...user };
		}

		// 生成 JWT 令牌
		const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";
		const token = jwt.sign(
			{
				email: user.email || `afdian_${user.afdian_user_id}`,
				username: user.username,
			},
			jwtSecret,
			{ expiresIn: "7d" },
		);

		// 重定向到 dashboard
		const response = NextResponse.redirect(new URL("/dashboard", request.url));
		response.cookies.set("auth-token", token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 7 * 24 * 60 * 60, // 7天
		});

		return response;
	} catch (error) {
		console.error("爱发电OAuth认证失败:", error);
		return NextResponse.json({ error: "认证失败" }, { status: 500 });
	}
}

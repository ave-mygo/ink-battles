import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { bindQQAccountWithCode, loginOrRegisterWithQQ } from "@/utils/auth/qq/server";
import { getCurrentUserInfo } from "@/utils/auth/server";

type QQOAuthMethod = "signin" | "signup" | "bind";

interface QQOAuthState {
	method: QQOAuthMethod;
	timestamp: number;
	random: string;
}

/**
 * QQ OAuth 回调 API Route
 * 验证 state，用 code 换取 openid，根据 state 中的 method 调用对应的 Server Action
 * 处理完成后返回重定向响应
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const code = searchParams.get("code");
		const stateParam = searchParams.get("state");
		const error = searchParams.get("error");

		// 处理授权错误
		if (error) {
			const errorMsg = searchParams.get("error_description") || "QQ 授权失败";
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent(errorMsg)}`, request.url),
			);
		}

		// 验证必要参数
		if (!code || !stateParam) {
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent("缺少必要参数")}`, request.url),
			);
		}

		// 解析 state
		let state: QQOAuthState;
		try {
			state = JSON.parse(stateParam);
		} catch {
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent("state 参数无效")}`, request.url),
			);
		}

		const { method } = state;

		// 根据 method 调用对应的 Server Action
		if (method === "signin" || method === "signup") {
			// 登录或注册
			const result = await loginOrRegisterWithQQ(code);
			if (result.success) {
				return NextResponse.redirect(new URL("/dashboard", request.url));
			} else {
				return NextResponse.redirect(
					new URL(`/signin?status=qq_login_error&msg=${encodeURIComponent(result.message)}`, request.url),
				);
			}
		} else if (method === "bind") {
			// 绑定 QQ 账号
			const user = await getCurrentUserInfo();
			if (!user) {
				return NextResponse.redirect(
					new URL(`/signin?status=qq_bind_need_login&msg=${encodeURIComponent("请先登录后再绑定 QQ")}`, request.url),
				);
			}

			const result = await bindQQAccountWithCode(code);
			const status = result.success ? "qq_bind_success" : "qq_bind_error";
			return NextResponse.redirect(
				new URL(`/dashboard/accounts?status=${status}&msg=${encodeURIComponent(result.message)}`, request.url),
			);
		} else {
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent("未知的授权类型")}`, request.url),
			);
		}
	} catch (error) {
		console.error("QQ OAuth 回调错误:", error);
		return NextResponse.redirect(
			new URL(`/signin?status=qq_error&msg=${encodeURIComponent("服务器错误")}`, request.url),
		);
	}
}

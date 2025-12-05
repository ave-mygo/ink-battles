import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getConfig } from "@/config";
import { bindQQAccountWithCode, loginOrRegisterWithQQ } from "@/utils/auth/qq/server";
import { getCurrentUserInfo } from "@/utils/auth/server";

type QQOAuthMethod = "signin" | "signup" | "bind";

interface QQOAuthState {
	method: QQOAuthMethod;
	timestamp: number;
	random: string;
	inviteCode?: string;
}

/**
 * 获取重定向基础 URL
 * 优先使用配置中的 base_url，确保在容器环境中正确重定向
 */
function getBaseUrl(): string {
	const config = getConfig();
	return config.app.base_url;
}

/**
 * QQ OAuth 回调 API Route
 * 验证 state，用 code 换取 openid，根据 state 中的 method 调用对应的 Server Action
 * 处理完成后返回重定向响应
 */
export async function GET(request: NextRequest) {
	const baseUrl = getBaseUrl();

	try {
		const searchParams = request.nextUrl.searchParams;
		const code = searchParams.get("code");
		const stateParam = searchParams.get("state");
		const error = searchParams.get("error");

		// 处理授权错误
		if (error) {
			const errorMsg = searchParams.get("error_description") || "QQ 授权失败";
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent(errorMsg)}`, baseUrl),
			);
		}

		// 验证必要参数
		if (!code || !stateParam) {
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent("缺少必要参数")}`, baseUrl),
			);
		}

		// 解析 state
		let state: QQOAuthState;
		try {
			state = JSON.parse(stateParam);
		} catch {
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent("state 参数无效")}`, baseUrl),
			);
		}

		const { method, inviteCode } = state;

		// 根据 method 调用对应的 Server Action
		if (method === "signin" || method === "signup") {
			// 登录或注册
			const result = await loginOrRegisterWithQQ(code, inviteCode);
			if (result.success) {
				return NextResponse.redirect(new URL("/dashboard", baseUrl));
			} else if (result.needInviteCode) {
				// 需要邀请码，重定向到注册页面并提示
				return NextResponse.redirect(
					new URL(`/signup?status=need_invite_code&msg=${encodeURIComponent(result.message)}&oauth=qq`, baseUrl),
				);
			} else {
				return NextResponse.redirect(
					new URL(`/signin?status=qq_login_error&msg=${encodeURIComponent(result.message)}`, baseUrl),
				);
			}
		} else if (method === "bind") {
			// 绑定 QQ 账号
			const user = await getCurrentUserInfo();
			if (!user) {
				return NextResponse.redirect(
					new URL(`/signin?status=qq_bind_need_login&msg=${encodeURIComponent("请先登录后再绑定 QQ")}`, baseUrl),
				);
			}

			const result = await bindQQAccountWithCode(code);
			const status = result.success ? "qq_bind_success" : "qq_bind_error";
			return NextResponse.redirect(
				new URL(`/dashboard/accounts?status=${status}&msg=${encodeURIComponent(result.message)}`, baseUrl),
			);
		} else {
			return NextResponse.redirect(
				new URL(`/signin?status=qq_error&msg=${encodeURIComponent("未知的授权类型")}`, baseUrl),
			);
		}
	} catch (error) {
		console.error("QQ OAuth 回调错误:", error);
		return NextResponse.redirect(
			new URL(`/signin?status=qq_error&msg=${encodeURIComponent("服务器错误")}`, baseUrl),
		);
	}
}

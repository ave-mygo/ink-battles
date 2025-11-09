import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getConfig } from "@/config";

export const metadata: Metadata = {
	title: "QQ 授权",
	description: "QQ OAuth 授权入口",
};

interface QQOAuthPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type QQOAuthMethod = "signin" | "signup" | "bind";

/**
 * QQ OAuth 入口页
 * 接收 method 参数（signin/signup/bind），生成包含 method 的 state，重定向到 QQ 授权页
 */
export default async function QQOAuthPage({ searchParams }: QQOAuthPageProps) {
	const params = await searchParams;
	const method = (typeof params?.method === "string" ? params.method : "signin") as QQOAuthMethod;

	// 生成包含 method 的 state
	const state = JSON.stringify({
		method,
		timestamp: Date.now(),
		random: Math.random().toString(36).substring(2),
	});

	const config = getConfig();
	const callbackUrl = `${config.app.base_url}/oauth/qq/callback`;

	// 构建 QQ 授权 URL
	const authUrl = new URL("https://api-space.tnxg.top/oauth/qq/authorize");
	authUrl.searchParams.set("redirect", "true");
	authUrl.searchParams.set("return_url", callbackUrl);
	authUrl.searchParams.set("state", state);

	redirect(authUrl.toString());
}

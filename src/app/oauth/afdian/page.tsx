import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getConfig } from "@/config";

// 强制动态渲染，确保配置在运行时读取
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "爱发电授权",
	description: "爱发电 OAuth 授权入口",
};

interface AfdianOAuthPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type AfdianOAuthMethod = "signin" | "signup" | "bind";

/**
 * 爱发电 OAuth 入口页
 * 接收 method 参数（signin/signup/bind）和可选的 inviteCode，生成包含 method 的 state，重定向到爱发电授权页
 */
export default async function AfdianOAuthPage({ searchParams }: AfdianOAuthPageProps) {
	const params = await searchParams;
	const method = (typeof params?.method === "string" ? params.method : "signin") as AfdianOAuthMethod;
	const inviteCode = typeof params?.inviteCode === "string" ? params.inviteCode : undefined;

	// 生成包含 method 和 inviteCode 的 state
	const state = JSON.stringify({
		method,
		timestamp: Date.now(),
		random: Math.random().toString(36).substring(2),
		inviteCode,
	});

	const config = getConfig();
	const { client_id, redirect_uri } = config.afdian;

	// 构建爱发电授权 URL
	const authUrl = new URL("https://afdian.com/oauth2/authorize");
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("scope", "basic");
	authUrl.searchParams.set("client_id", client_id);
	authUrl.searchParams.set("redirect_uri", redirect_uri);
	authUrl.searchParams.set("state", state);

	redirect(authUrl.toString());
}

import type { Metadata } from "next";
import process from "node:process";
import { redirect } from "next/navigation";

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

	const authUrl = new URL("/api/v2/rpc/oauth.afdianStart", process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || "http://localhost:3001");
	authUrl.searchParams.set("method", method);
	authUrl.searchParams.set("state", state);
	if (inviteCode)
		authUrl.searchParams.set("inviteCode", inviteCode);

	redirect(authUrl.toString());
}

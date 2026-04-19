import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOAuthAppBaseUrl } from "@/utils/auth/oauth-server";

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
 * 接收 method 参数（signin/signup/bind）和可选的 inviteCode，转交后端生成签名 state 并跳转授权页
 */
export default async function AfdianOAuthPage({ searchParams }: AfdianOAuthPageProps) {
	const params = await searchParams;
	const method = (typeof params?.method === "string" ? params.method : "signin") as AfdianOAuthMethod;
	const inviteCode = typeof params?.inviteCode === "string" ? params.inviteCode : undefined;

	const authUrl = new URL("/api/v2/rpc/oauth.afdianStart", getOAuthAppBaseUrl());
	authUrl.searchParams.set("method", method);
	if (inviteCode)
		authUrl.searchParams.set("inviteCode", inviteCode);

	redirect(authUrl.toString());
}

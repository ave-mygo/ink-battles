import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthBaseUrl } from "@/utils/auth/redirect";

// 强制动态渲染，确保配置在运行时读取
export const dynamic = "force-dynamic";

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
 * 接收 method 参数（signin/signup/bind）和可选的 inviteCode，转交后端生成签名 state 并跳转授权页
 */
export default async function QQOAuthPage({ searchParams }: QQOAuthPageProps) {
  const params = await searchParams;
  const method = (typeof params?.method === "string" ? params.method : "signin") as QQOAuthMethod;
  const inviteCode = typeof params?.inviteCode === "string" ? params.inviteCode : undefined;
  if (method === "bind") {
    redirect(`${getAuthBaseUrl()}/dashboard`);
  }

  const authParams = new URLSearchParams({ method });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || "http://localhost:3000";
  authParams.set("returnTo", `${siteUrl}/dashboard`);
  if (inviteCode)
    authParams.set("inviteCode", inviteCode);

  redirect(`${getAuthBaseUrl()}/api/auth/oauth/qq/start?${authParams.toString()}`);
}

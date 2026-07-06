import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAuthRedirectUrl } from "@/utils/auth/redirect";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "用户登录",
    description: "跳转到 Ink Battles 统一认证中心登录",
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  redirect(createAuthRedirectUrl("/", params?.returnTo || params?.redirect));
}


import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAuthRedirectUrl } from "@/utils/auth/redirect";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "用户注册",
    description: "跳转到 Ink Battles 统一认证中心注册",
  };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  redirect(createAuthRedirectUrl("/register", params?.returnTo || params?.redirect));
}


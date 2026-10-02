import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAuthRedirectUrl } from "@/utils/auth/redirect";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "忘记密码",
    description: "跳转到 Minato 统一认证中心重置密码",
  };
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  redirect(createAuthRedirectUrl("/forgot-password", params?.returnTo || params?.redirect));
}

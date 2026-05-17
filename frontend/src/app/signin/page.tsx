import type { PublicConfigResponse } from "@ink-battles/shared/types/common/public-config";
import type { Metadata } from "next";
import { Suspense } from "react";
import SignInForm from "@/components/layouts/Auth/SignInForm";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "用户登录",
    description: "登录您的账户，享受无限制的AI文本分析服务",
  };
}

export default async function SignInPage() {
  const api = await createServerEden();
  const response = await api.api.v2.config.public.get();
  const publicConfig = await unwrapEdenPayload<PublicConfigResponse>(response.data, response.error, {});
  const inviteCodeRequired = publicConfig.registration?.invite_code_required ?? false;

  return (
    <Suspense fallback={<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">加载中...</div>}>
      <SignInForm inviteCodeRequired={inviteCodeRequired} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import type { PublicConfigResponse } from "@ink-battles/shared/types/common/public-config";
import { Suspense } from "react";
import SignUpForm from "@/components/layouts/Auth/SignUpForm";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户注册",
		description: "创建新账户，开启您的AI写作分析之旅",
	};
}

export default async function SignUpPage() {
	const api = await createServerEden();
	const response = await api.api.v2.config.public.get();
	const publicConfig = await unwrapEdenPayload<PublicConfigResponse>(response.data, response.error, {});
	const inviteCodeRequired = publicConfig.registration?.invite_code_required ?? false;

	return (
		<Suspense fallback={<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">加载中...</div>}>
			<SignUpForm inviteCodeRequired={inviteCodeRequired} />
		</Suspense>
	);
}

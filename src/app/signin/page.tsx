import type { Metadata } from "next";
import { Suspense } from "react";
import SignInForm from "@/components/layouts/Auth/SignInForm";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户登录",
		description: "登录您的账户，享受无限制的AI文本分析服务",
	};
}

export default function SignInPage() {
	return (
		<Suspense fallback={<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">加载中...</div>}>
			<SignInForm />
		</Suspense>
	);
}

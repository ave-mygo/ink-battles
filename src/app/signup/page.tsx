import type { Metadata } from "next";
import { Suspense } from "react";
import SignUpForm from "@/components/layouts/Auth/SignUpForm";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户注册",
		description: "创建新账户，开启您的AI写作分析之旅",
	};
}

export default function SignUpPage() {
	return (
		<Suspense fallback={<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">加载中...</div>}>
			<SignUpForm />
		</Suspense>
	);
}

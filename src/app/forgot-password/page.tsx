import type { Metadata } from "next";
import { Suspense } from "react";
import ForgotPasswordForm from "@/components/layouts/Auth/ForgotPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "忘记密码",
		description: "重置您的账户密码",
	};
}

export default function ForgotPasswordPage() {
	return (
		<Suspense fallback={<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">加载中...</div>}>
			<ForgotPasswordForm />
		</Suspense>
	);
}

import type { Metadata } from "next";
import SignInForm from "@/components/layouts/Auth/SignInForm";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户登录",
		description: "登录您的账户，享受无限制的AI文本分析服务",
	};
}

export default function SignInPage() {
	return <SignInForm />;
}

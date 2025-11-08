import type { Metadata } from "next";
import SignInForm from "@/components/layouts/Auth/SignInForm";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户登录 - 作家战力分析系统",
		description: "登录您的账户，开启无限制的AI文本分析服务。支持邮箱和QQ登录，快速便捷的创意写作体验。",
	};
}

export default function SignInPage() {
	return <SignInForm />;
}

import type { Metadata } from "next";
import SignUpForm from "@/components/layouts/Auth/SignUpForm";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户注册 - 作家战力分析系统",
		description: "创建新账户，开启您的AI写作分析之旅。免费注册即获完整功能权限，加入全球创意写作社区。",
	};
}

export default function SignUpPage() {
	return <SignUpForm />;
}

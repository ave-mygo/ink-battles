import type { Metadata } from "next";
import SignUpForm from "@/components/layouts/Auth/SignUpForm";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户注册",
		description: "创建新账户，开启您的AI写作分析之旅",
	};
}

export default function SignUpPage() {
	return <SignUpForm />;
}

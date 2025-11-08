"use client";
import type { Metadata } from "next";
import TokenContent from "@/components/layouts/Token/TokenContent";
import TokenHeader from "@/components/layouts/Token/TokenHeader";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	return createPageMetadata({
		pathname: "/token",
		title: "API Token 管理",
		description: "管理您的 API Token，集成作家战力分析服务到您的应用中",
		keywords: ["API", "Token", "集成", "开发者"],
	});
}

export default function TokenPage() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				<TokenHeader />
				<TokenContent />
			</div>
		</div>
	);
}

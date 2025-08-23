import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HistoryDetailClient from "@/components/history/HistoryDetailClient";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "历史评分详情",
		description: "查看历史分析的完整评分详情",
	};
}

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;
	if (!token)
		redirect("/signin");

	return <HistoryDetailClient id={id} />;
}

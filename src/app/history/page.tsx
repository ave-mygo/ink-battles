import type { Metadata } from "next";
import process from "node:process";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HistoryClient } from "@/components/history/HistoryClient";
import { getAnalysisHistory } from "@/lib/analysis-history";
import { getUserSubscriptionData } from "@/lib/subscription";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "分析历史",
		description: "查看您的历史分析报告和评分记录",
	};
}

async function getHistoryPageData(token: string) {
	try {
		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			throw new Error("无效的令牌");
		}

		// 并行获取用户数据和历史记录
		const [userData, historyData] = await Promise.all([
			getUserSubscriptionData(userEmail),
			getAnalysisHistory(token, 1, 10),
		]);

		return { userData, historyData };
	} catch (error) {
		console.error("获取用户数据失败:", error);
		throw error;
	}
}

export default async function HistoryPage() {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;

	if (!token) {
		redirect("/signin");
	}

	try {
		const { userData, historyData } = await getHistoryPageData(token);
		return <HistoryClient _initialData={userData} initialHistory={historyData} />;
	} catch (error) {
		console.error("History页面数据获取失败:", error);
		redirect("/signin");
	}
}

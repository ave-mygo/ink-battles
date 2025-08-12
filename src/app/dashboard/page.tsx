import type { Metadata } from "next";
import type { UserSubscriptionData } from "@/lib/subscription";
import { webcrypto } from "node:crypto";
import process from "node:process";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getUserSubscriptionData } from "@/lib/subscription";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户中心",
		description: "管理您的账户信息、查看使用统计和订阅状态",
	};
}

async function getDashboardData(token: string): Promise<UserSubscriptionData> {
	try {
		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			throw new Error("无效的令牌");
		}

		// 使用统一的函数获取用户订阅数据
		return await getUserSubscriptionData(userEmail);
	} catch (error) {
		console.error("获取用户数据失败:", error);
		throw error;
	}
}

// 服务端生成OAuth URL和state
async function generateOAuthUrl() {
	const clientId = process.env.AFDIAN_CLIENT_ID;
	const redirectUri = process.env.AFDIAN_REDIRECT_URI;

	if (!clientId || !redirectUri) {
		throw new Error("OAuth配置缺失");
	}

	// 服务端生成安全的state
	const state = webcrypto.getRandomValues(new Uint32Array(4)).join("");
	const scope = "basic";

	// 构建OAuth URL
	const authUrl = `https://afdian.com/oauth2/authorize?response_type=code&scope=${scope}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

	return {
		authUrl,
		state,
	};
}

export default async function DashboardPage() {
	const cookieStore = await cookies();
	const token = cookieStore.get("auth-token")?.value;

	if (!token) {
		redirect("/signin");
	}

	try {
		// 并行获取数据以提升性能
		const [data, oauthConfig] = await Promise.all([
			getDashboardData(token),
			generateOAuthUrl(),
		]);

		return <DashboardClient initialData={data} oauthConfig={oauthConfig} />;
	} catch (error) {
		// 记录错误以便调试
		console.error("Dashboard页面数据获取失败:", error);
		redirect("/signin");
	}
}

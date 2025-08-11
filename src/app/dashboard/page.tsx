import type { Metadata } from "next";
import { webcrypto } from "node:crypto";
import process from "node:process";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { db_name } from "@/lib/constants";
import { db_find } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "用户中心",
		description: "管理您的账户信息、查看使用统计和订阅状态",
	};
}

async function getDashboardData(token: string) {
	try {
		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			throw new Error("无效的令牌");
		}

		const user = await db_find(db_name, "users", { email: userEmail });
		if (!user) {
			throw new Error("用户不存在");
		}

		// 检查是否绑定了爱发电账号
		if (!user.afdian_user_id || !user.afdian_access_token) {
			const safeId = (user as any)._id?.toString ? (user as any)._id.toString() : String((user as any)._id ?? "");
			const safeUsername = user.username || (user.email ? String(user.email).split("@")[0] : "用户");
			const safeEmail = user.email || "";
			const safeAvatar = user.avatar || "";
			return {
				user: {
					id: safeId,
					username: safeUsername,
					email: safeEmail,
					avatar: safeAvatar,
					afdian_bound: false,
				},
				subscription: {
					isSubscribed: false,
					sponsorInfo: null,
					totalAmount: 0,
					currentPlan: null,
					subscriptionStatus: "not_bound",
				},
			};
		}

		// 返回包含爱发电信息的用户数据
		const safeId = (user as any)._id?.toString ? (user as any)._id.toString() : String((user as any)._id ?? "");
		const safeUsername = user.username || (user.email ? String(user.email).split("@")[0] : "用户");
		const safeEmail = user.email || "";
		const safeAvatar = user.avatar || user.afdian_avatar || "";
		return {
			user: {
				id: safeId,
				username: safeUsername,
				email: safeEmail,
				avatar: safeAvatar,
				afdian_bound: true,
				afdian_user_id: user.afdian_user_id,
				afdian_username: user.afdian_username,
			},
			subscription: {
				isSubscribed: false,
				sponsorInfo: null,
				totalAmount: 0,
				currentPlan: null,
				subscriptionStatus: "inactive",
			},
		};
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
		const data = await getDashboardData(token);
		const oauthConfig = await generateOAuthUrl();

		return <DashboardClient initialData={data} oauthConfig={oauthConfig} />;
	} catch {
		// 如果获取数据失败，重定向到登录页
		redirect("/signin");
	}
}

import type { NextRequest } from "next/server";
import process from "node:process";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getUserBilling } from "@/lib/billing";
import { db_name, getUserType, UserType } from "@/lib/constants";
import { db_read } from "@/lib/db";
import { getUserSubscriptionData } from "@/lib/subscription";

import type { UsageStats } from "@/types/billing/usage";

export async function GET(_request: NextRequest) {
	try {
		const cookieStore = await cookies();
		const token = cookieStore.get("auth-token")?.value;

		if (!token) {
			return Response.json({ error: "未登录" }, { status: 401 });
		}

		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		let userEmail: string;

		try {
			const payload = jwt.verify(token, secret) as { email?: string };
			userEmail = payload.email!;
		} catch {
			return Response.json({ error: "无效的令牌" }, { status: 401 });
		}

		// 获取用户订阅信息
		let donationAmount = 0;
		try {
			const subscriptionData = await getUserSubscriptionData(userEmail);
			donationAmount = subscriptionData.subscription.totalAmount || 0;
		} catch (error) {
			console.warn("获取用户订阅信息失败:", error);
		}

		const userType = getUserType(true, donationAmount);

		// 日期计算
		const today = new Date();
		const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

		// 获取分析记录统计
		const totalAnalysisData = await db_read(db_name, "analysis_requests", { userEmail });
		const monthlyAnalysisData = await db_read(db_name, "analysis_requests", {
			userEmail,
			timestamp: { $gte: monthStart.toISOString() },
		});
		const todayAnalysisData = await db_read(db_name, "analysis_requests", {
			userEmail,
			timestamp: { $gte: todayStart.toISOString() },
		});

		// 统计分析次数和文本长度
		const totalAnalysis = totalAnalysisData.length;
		const monthlyAnalysis = monthlyAnalysisData.length;
		const todayAnalysis = todayAnalysisData.length;

		const totalTextLength = totalAnalysisData.reduce((sum, record) => {
			return sum + (record.articleText?.length || 0);
		}, 0);

		const monthlyTextLength = monthlyAnalysisData.reduce((sum, record) => {
			return sum + (record.articleText?.length || 0);
		}, 0);

		const todayTextLength = todayAnalysisData.reduce((sum, record) => {
			return sum + (record.articleText?.length || 0);
		}, 0);

		// 获取用户限制信息
		const { USER_LIMITS } = await import("@/lib/constants");
		const limits = USER_LIMITS[userType];

		const stats: UsageStats = {
			userType,
			totalAnalysis,
			monthlyAnalysis,
			todayAnalysis,
			totalTextLength,
			monthlyTextLength,
			todayTextLength,
			limits: {
				perRequest: limits.perRequest,
				dailyLimit: limits.dailyLimit,
			},
		};

		// 如果是会员用户，获取高级模型使用统计
		if (userType === UserType.MEMBER && donationAmount > 0) {
			try {
				const billing = await getUserBilling(userEmail);
				
				// 计算本月已使用次数：基础次数 - 当前余额
				const initialGrantCalls = 10; // 保底次数，应该从当月grant记录获取，这里先用常量
				const monthlyUsed = Math.max(0, initialGrantCalls - billing.grantCallsRemaining);

				stats.advancedModelStats = {
					grantCallsRemaining: billing.grantCallsRemaining,
					paidCallsRemaining: billing.paidCallsRemaining,
					todayUsed: monthlyUsed, // 实际是本月使用量，但保持字段名兼容
				};
			} catch (error) {
				console.warn("获取计费信息失败:", error);
			}
		}

		return Response.json(stats);
	} catch (error) {
		console.error("获取使用统计失败:", error);
		return Response.json(
			{ error: "获取统计数据失败" },
			{ status: 500 },
		);
	}
}

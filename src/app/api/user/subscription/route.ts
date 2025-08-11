import type { NextRequest } from "next/server";
import process from "node:process";
import jwt from "jsonwebtoken";
import md5 from "md5";
import { NextResponse } from "next/server";
import { db_name } from "@/lib/constants";
import { db_find } from "@/lib/db";

const AFDIAN_API_TOKEN = process.env.AFDIAN_API_TOKEN;
const AFDIAN_USER_ID = process.env.AFDIAN_USER_ID;

export async function GET(request: NextRequest) {
	const token = request.cookies.get("auth-token")?.value;
	if (!token) {
		return NextResponse.json({ error: "未授权" }, { status: 401 });
	}

	try {
		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			return NextResponse.json({ error: "无效的令牌" }, { status: 401 });
		}

		// 通过邮箱查找用户
		const user = await db_find(db_name, "users", { email: userEmail });
		if (!user) {
			return NextResponse.json({ error: "用户不存在" }, { status: 404 });
		}

		// 检查是否绑定了爱发电账号
		if (!user.afdian_user_id || !user.afdian_access_token) {
			return NextResponse.json({
				user: {
					id: user._id,
					username: user.username,
					email: user.email,
					avatar: user.avatar,
					afdian_bound: false,
				},
				subscription: {
					isSubscribed: false,
					sponsorInfo: null,
					totalAmount: 0,
					currentPlan: null,
					subscriptionStatus: "not_bound",
				},
			});
		}

		// 使用爱发电API获取用户的订阅信息
		const ts = Math.floor(Date.now() / 1000);
		const params = JSON.stringify({
			user_id: user.afdian_user_id,
		});
		const sign = md5(`${AFDIAN_API_TOKEN}params${params}ts${ts}user_id${AFDIAN_USER_ID}`);

		const response = await fetch("https://afdian.com/api/open/query-sponsor", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${user.afdian_access_token}`,
			},
			body: JSON.stringify({
				user_id: AFDIAN_USER_ID,
				params,
				ts,
				sign,
			}),
		});

		if (!response.ok) {
			console.error("爱发电API调用失败:", await response.text());
			// 如果API调用失败，返回基本用户信息
			return NextResponse.json({
				user: {
					id: user._id,
					username: user.username,
					email: user.email,
					avatar: user.avatar || user.afdian_avatar,
					afdian_bound: true,
					afdian_username: user.afdian_username,
				},
				subscription: {
					isSubscribed: false,
					sponsorInfo: null,
					totalAmount: 0,
					currentPlan: null,
					subscriptionStatus: "api_error",
				},
			});
		}

		const data = await response.json();

		// 检查用户是否有有效的订阅
		const sponsorData = data.data?.list || [];
		const userSponsor = sponsorData.find((sponsor: any) =>
			sponsor.user?.user_id === user.afdian_user_id,
		);

		const subscriptionInfo = {
			isSubscribed: !!userSponsor,
			sponsorInfo: userSponsor || null,
			totalAmount: userSponsor?.all_sum_amount || 0,
			currentPlan: userSponsor?.current_plan || null,
			subscriptionStatus: userSponsor?.status || "inactive",
		};

		return NextResponse.json({
			user: {
				id: user._id,
				username: user.username,
				email: user.email,
				avatar: user.avatar || user.afdian_avatar,
				afdian_bound: true,
				afdian_user_id: user.afdian_user_id,
				afdian_username: user.afdian_username,
			},
			subscription: subscriptionInfo,
		});
	} catch (error) {
		console.error("获取用户订阅信息失败:", error);
		return NextResponse.json({ error: "获取订阅信息失败" }, { status: 500 });
	}
}

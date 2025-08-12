import type { NextRequest } from "next/server";
import process from "node:process";
import jwt from "jsonwebtoken";
import md5 from "md5";
import { NextResponse } from "next/server";
import { db_name } from "@/lib/constants";
import { db_find, db_update } from "@/lib/db";

const AFDIAN_API_TOKEN = process.env.AFDIAN_API_TOKEN;
const AFDIAN_USER_ID = process.env.AFDIAN_USER_ID;

export async function POST(request: NextRequest) {
	try {
		const token = request.cookies.get("auth-token")?.value;
		if (!token) {
			return NextResponse.json({ error: "未授权" }, { status: 401 });
		}

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

		const { orderId } = await request.json();

		if (!orderId) {
			return NextResponse.json({ error: "请提供订单号" }, { status: 400 });
		}

		// 检查用户是否已绑定爱发电账号
		if (user.afdian_user_id) {
			return NextResponse.json({ error: "已绑定爱发电账号，请先解绑" }, { status: 400 });
		}

		// 使用爱发电API查询订单信息
		const ts = Math.floor(Date.now() / 1000);
		const params = JSON.stringify({
			out_trade_no: orderId,
		});
		const sign = md5(`${AFDIAN_API_TOKEN}params${params}ts${ts}user_id${AFDIAN_USER_ID}`);

		const orderResponse = await fetch("https://afdian.com/api/open/query-order", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				user_id: AFDIAN_USER_ID,
				params,
				ts,
				sign,
			}),
		});

		if (!orderResponse.ok) {
			console.error("爱发电订单查询API调用失败:", await orderResponse.text());
			return NextResponse.json({ error: "订单查询失败，请检查订单号是否正确" }, { status: 400 });
		}

		const orderData = await orderResponse.json();

		if (orderData.ec !== 200) {
			return NextResponse.json({ error: orderData.em || "订单查询失败" }, { status: 400 });
		}

		const orderList = orderData.data?.list || [];
		const targetOrder = orderList.find((order: any) => order.out_trade_no === orderId);

		if (!targetOrder) {
			return NextResponse.json({ error: "未找到对应的订单" }, { status: 404 });
		}

		const afdianUserId = targetOrder.user_id;
		const afdianUsername = targetOrder.user_private_name || "爱发电用户";

		// 检查该爱发电用户是否已被其他账号绑定
		const existingBinding = await db_find(db_name, "users", { afdian_user_id: afdianUserId });
		if (existingBinding && existingBinding.email !== userEmail) {
			return NextResponse.json({ error: "该爱发电账号已被其他用户绑定" }, { status: 409 });
		}

		// 查询该爱发电用户的所有订单以计算总捐赠额
		const allOrdersParams = JSON.stringify({
			user_id: afdianUserId,
		});
		const allOrdersTs = Math.floor(Date.now() / 1000);
		const allOrdersSign = md5(`${AFDIAN_API_TOKEN}params${allOrdersParams}ts${allOrdersTs}user_id${AFDIAN_USER_ID}`);

		const allOrdersResponse = await fetch("https://afdian.com/api/open/query-order", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				user_id: AFDIAN_USER_ID,
				params: allOrdersParams,
				ts: allOrdersTs,
				sign: allOrdersSign,
			}),
		});

		let totalAmount = 0;
		if (allOrdersResponse.ok) {
			const allOrdersData = await allOrdersResponse.json();
			if (allOrdersData.ec === 200 && allOrdersData.data?.list) {
				// 计算该用户的总捐赠额
				totalAmount = allOrdersData.data.list
					.filter((order: any) => order.user_id === afdianUserId && order.status === 2) // status 2 表示已完成
					.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);
			}
		}

		// 更新用户信息，绑定爱发电账号
		await db_update(
			db_name,
			"users",
			{ email: userEmail },
			{
				afdian_user_id: afdianUserId,
				afdian_username: afdianUsername,
				afdian_bound_order_id: orderId,
				afdian_total_amount: totalAmount,
				updated_at: new Date(),
			},
		);

		return NextResponse.json({
			success: true,
			message: "爱发电账号绑定成功",
			data: {
				afdian_user_id: afdianUserId,
				afdian_username: afdianUsername,
				total_amount: totalAmount,
				order_id: orderId,
			},
		});
	} catch (error) {
		console.error("订单号验证绑定失败:", error);
		return NextResponse.json({ error: "绑定失败，请重试" }, { status: 500 });
	}
}

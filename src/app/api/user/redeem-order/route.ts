import type { NextRequest } from "next/server";
import type { CreateOrderUsageRecordData } from "@/types/OrderUsageRecord";
import process from "node:process";
import jwt from "jsonwebtoken";
import md5 from "md5";
import { NextResponse } from "next/server";
import { addPaidCalls } from "@/lib/billing";
import { calculatePaidCallPrice, db_name } from "@/lib/constants";
import { db_find, db_insert } from "@/lib/db";
import { getUserSubscriptionData } from "@/lib/subscription";

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
			return NextResponse.json({ error: "请填写订单号" }, { status: 400 });
		}

		// 检查用户是否绑定了爱发电账号
		if (!user.afdian_user_id) {
			return NextResponse.json({ error: "请先绑定爱发电账号才能兑换订单" }, { status: 400 });
		}

		// 检查订单号是否已被使用
		const existingRecord = await db_find(db_name, "order_usage_records", { orderId });
		if (existingRecord) {
			return NextResponse.json({ error: "该订单号已被使用过" }, { status: 409 });
		}

		// 通过爱发电API查询订单信息
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

		// 验证订单用户和绑定账户是否匹配
		if (targetOrder.user_id !== user.afdian_user_id) {
			return NextResponse.json({ error: "订单用户与绑定账户不匹配" }, { status: 403 });
		}

		// 获取订单金额并计算兑换次数
		const orderAmount = Number.parseFloat(targetOrder.total_amount) || 0;

		// 获取用户的计费信息和累计消费总额
		const subscriptionData = await getUserSubscriptionData(userEmail);
		const totalSpent = subscriptionData.subscription.totalAmount || 0;

		// 计算该用户享受的付费调用价格（含折扣）
		const discountedPrice = calculatePaidCallPrice(totalSpent);

		// 根据享受折扣后的价格计算可兑换的调用次数
		const redemptionValue = Math.floor(orderAmount / discountedPrice);

		if (redemptionValue <= 0) {
			return NextResponse.json({ error: "订单金额不足以兑换调用次数" }, { status: 400 });
		}

		// 创建兑换记录
		const usageRecord: CreateOrderUsageRecordData = {
			orderId,
			userEmail,
			redeemType: "calls",
			redemptionValue,
			description: `订单金额: ${orderAmount}元，会员折扣价: ${discountedPrice.toFixed(2)}元/次，兑换次数: ${redemptionValue}次`,
		};

		const recordData = {
			...usageRecord,
			usedAt: new Date(),
		};

		// 保存兑换记录
		const insertResult = await db_insert(db_name, "order_usage_records", recordData);
		if (!insertResult) {
			return NextResponse.json({ error: "记录保存失败" }, { status: 500 });
		}

		// 调用计费系统增加付费调用次数
		const addCallsResult = await addPaidCalls(userEmail, redemptionValue, `订单号 ${orderId} 兑换获得`);
		if (!addCallsResult.success) {
			return NextResponse.json({ error: "调用次数添加失败" }, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: `兑换成功，获得 ${redemptionValue} 次调用`,
			data: {
				orderId,
				orderAmount,
				totalSpent,
				discountedPrice: Number(discountedPrice.toFixed(2)),
				redemptionValue,
				redeemType: "calls",
				calculation: `${orderAmount}元 ÷ ${discountedPrice.toFixed(2)}元/次 = ${redemptionValue}次`,
				description: usageRecord.description,
				usedAt: recordData.usedAt,
			},
		});
	} catch (error) {
		console.error("订单号兑换失败:", error);
		return NextResponse.json({ error: "兑换失败，请重试" }, { status: 500 });
	}
}

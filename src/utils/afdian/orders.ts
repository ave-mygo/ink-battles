"use server";

import md5 from "md5";
import { getConfig } from "@/config";
import "server-only";

const { afdian: { api_token, user_id } } = getConfig();

/**
 * 爱发电订单详情接口返回的订单数据结构
 */
interface AfdianOrderData {
	out_trade_no: string; // 订单号
	user_id: string; // 下单用户的爱发电ID
	user_private_id: string; // 用户唯一标识
	total_amount: string; // 订单金额
	status: number; // 订单状态：2表示交易成功
	name: string; // 下单用户昵称
	avatar: string; // 用户头像
}

/**
 * 爱发电API响应结构
 */
interface AfdianApiResponse {
	ec: number;
	em: string;
	data?: {
		list: AfdianOrderData[];
	};
}

/**
 * 通过订单号查询订单详情
 * @param orderNo 订单号 (out_trade_no)
 * @returns 订单详情或null
 */
export async function getOrderDetails(orderNo: string): Promise<AfdianOrderData | null> {
	const ts = Math.floor(Date.now() / 1000);
	const params = JSON.stringify({ out_trade_no: orderNo });
	const sign = md5(`${api_token}params${params}ts${ts}user_id${user_id}`);

	const response = await fetch("https://afdian.com/api/open/query-order", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			user_id,
			params,
			ts,
			sign,
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to fetch order details");
	}

	const data: AfdianApiResponse = await response.json();

	if (data.ec !== 200) {
		throw new Error(`API错误: ${data.em}`);
	}

	const orderList = data.data?.list || [];
	const targetOrder = orderList.find(order => order.out_trade_no === orderNo);

	return targetOrder || null;
}

/**
 * 验证订单是否属于指定用户
 * @param orderNo 订单号
 * @param afdId 用户的爱发电ID
 * @returns 验证结果和订单金额
 */
export async function verifyOrderOwnership(
	orderNo: string,
	afdId: string,
): Promise<{ valid: boolean; amount?: number; message: string }> {
	try {
		const order = await getOrderDetails(orderNo);

		if (!order) {
			return { valid: false, message: "未找到对应的订单" };
		}

		if (order.status !== 2) {
			return { valid: false, message: "订单状态异常，仅支持已完成的订单" };
		}

		if (order.user_id !== afdId) {
			return { valid: false, message: "订单不属于当前用户" };
		}

		const amount = Number.parseFloat(order.total_amount);
		if (Number.isNaN(amount) || amount <= 0) {
			return { valid: false, message: "订单金额异常" };
		}

		return { valid: true, amount, message: "验证成功" };
	} catch (error) {
		return {
			valid: false,
			message: `验证失败: ${error instanceof Error ? error.message : "未知错误"}`,
		};
	}
}

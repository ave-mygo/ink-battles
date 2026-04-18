import crypto from "node:crypto";
import { getConfig } from "../config";

export const queryAfdianSponsors = async (page: number) => {
	const { afdian } = getConfig();
	const params = JSON.stringify({ page });
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const sign = crypto
		.createHash("md5")
		.update(`${afdian.api_token}params${params}ts${timestamp}user_id${afdian.user_id}`)
		.digest("hex");

	const response = await fetch("https://ifdian.net/api/open/query-sponsor", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user_id: afdian.user_id, params, ts: timestamp, sign }),
	});
	return response.json();
};

export const queryAfdianOrder = async (orderNo: string) => {
	const { afdian } = getConfig();
	const params = JSON.stringify({ out_trade_no: orderNo });
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const sign = crypto
		.createHash("md5")
		.update(`${afdian.api_token}params${params}ts${timestamp}user_id${afdian.user_id}`)
		.digest("hex");

	const response = await fetch("https://ifdian.net/api/open/query-order", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ user_id: afdian.user_id, params, ts: timestamp, sign }),
	});
	return response.json();
};

export const verifyOrderOwnership = async (orderNo: string, afdId: string) => {
	const data = await queryAfdianOrder(orderNo);
	const order = data?.data?.list?.[0];
	if (!order)
		return { valid: false, message: "订单不存在" };
	if (order.user_id !== afdId)
		return { valid: false, message: "订单不属于当前爱发电账号" };
	if (order.status !== 2)
		return { valid: false, message: "订单未支付完成" };
	return { valid: true, message: "订单验证成功", amount: Number(order.total_amount) || 0 };
};

export const exchangeAfdianCode = async (code: string) => {
	const { afdian } = getConfig();
	const response = await fetch("https://ifdian.net/api/oauth2/access_token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: afdian.client_id,
			client_secret: afdian.client_secret,
			redirect_uri: afdian.redirect_uri,
			code,
		}),
	});
	return response.json();
};

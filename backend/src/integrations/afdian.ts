import crypto from "node:crypto";
import { getConfig } from "../config";

/**
 * 查询爱发电赞助者列表
 * @param page - 页码
 * @returns 爱发电API返回的赞助者数据
 */
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

/**
 * 查询爱发电订单详情
 * @param orderNo - 订单号
 * @returns 爱发电API返回的订单数据
 */
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

/**
 * 验证订单归属和支付状态
 * @param orderNo - 订单号
 * @param afdId - 爱发电用户ID
 * @returns 验证结果，包含是否有效、提示信息和订单金额
 */
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

/**
 * 使用授权码换取爱发电访问令牌
 * @param code - OAuth授权码
 * @param redirectUri - 回调地址，默认使用配置中的地址
 * @returns 爱发电API返回的访问令牌数据
 */
export const exchangeAfdianCode = async (code: string, redirectUri = getConfig().afdian.redirect_uri) => {
	const { afdian } = getConfig();
	const response = await fetch("https://ifdian.net/api/oauth2/access_token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: afdian.client_id,
			client_secret: afdian.client_secret,
			redirect_uri: redirectUri,
			code,
		}),
	});
	return response.json();
};

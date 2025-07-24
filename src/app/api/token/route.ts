import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateOrUpdateToken, queryOrderByNumber } from "@/lib/token-server";

/**
 * 获取客户端IP地址
 */
function getClientIp(request: NextRequest): string {
	const forwarded = request.headers.get("x-forwarded-for");
	const realIp = request.headers.get("x-real-ip");
	const remoteAddr = request.headers.get("x-remote-addr");

	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}
	if (realIp) {
		return realIp;
	}
	if (remoteAddr) {
		return remoteAddr;
	}
	return "unknown";
}

/**
 * POST /api/token
 * 通过订单号或旧token签发/更新API Token
 * 支持浏览器指纹验证和数据库存储
 *
 * @param request - 包含订单号/token和浏览器指纹的请求
 * @returns 签发的token或错误信息
 */
export async function POST(request: NextRequest) {
	try {
		const { identifier, browserFingerprint } = await request.json();

		// 验证请求参数
		if (!identifier || typeof identifier !== "string") {
			return NextResponse.json(
				{ error: "订单号或Token不能为空" },
				{ status: 400 },
			);
		}

		if (!browserFingerprint || typeof browserFingerprint !== "string") {
			return NextResponse.json(
				{ error: "浏览器指纹不能为空" },
				{ status: 400 },
			);
		}

		// 获取用户IP
		const userIp = getClientIp(request);

		// 检查是否为token格式（64位十六进制）
		const isTokenFormat = /^[a-f0-9]{64}$/i.test(identifier);

		let orderData = null;
		if (!isTokenFormat) {
			// 验证订单号格式
			const orderPattern = /^[A-Z0-9]{10,30}$/i;
			if (!orderPattern.test(identifier)) {
				return NextResponse.json(
					{ error: "订单号格式不正确" },
					{ status: 400 },
				);
			}

			// 验证订单号是否有效（调用爱发电API）
			orderData = await queryOrderByNumber(identifier);
			if (!orderData.success || !orderData.order) {
				return NextResponse.json(
					{ error: orderData.message || "订单号无效或未找到对应的赞助记录" },
					{ status: 404 },
				);
			}
		}

		// 生成或更新token
		const result = await generateOrUpdateToken(
			identifier,
			browserFingerprint,
			userIp,
			orderData?.order?.create_time ? new Date(orderData.order.create_time * 1000) : undefined,
		);

		if (!result.success) {
			return NextResponse.json(
				{ error: result.message || "Token生成失败" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			token: result.token,
			message: result.message || "Token签发成功！请妥善保管您的Token。",
			isUpdate: result.isUpdate || false,
			userInfo: orderData?.order
				? {
						userName: orderData.order.user_name || orderData.order.sponsor_name || "尊敬的用户",
						orderNumber: orderData.order.out_trade_no,
						amount: orderData.order.total_amount,
						createTime: orderData.order.create_time,
					}
				: null,
		});
	} catch (error) {
		console.error("Token签发失败:", error);
		return NextResponse.json(
			{ error: "服务器内部错误，请稍后重试" },
			{ status: 500 },
		);
	}
}

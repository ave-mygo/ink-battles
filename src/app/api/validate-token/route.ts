import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/token-server";

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
 * POST /api/validate-token
 * 验证API Token的有效性
 * 支持浏览器指纹验证和IP检查
 *
 * @param request - 包含token和浏览器指纹的请求
 * @returns 验证结果
 */
export async function POST(request: NextRequest) {
	try {
		const { token, browserFingerprint } = await request.json();

		// 验证请求参数
		if (!token || typeof token !== "string") {
			return NextResponse.json(
				{ valid: false, reason: "Token不能为空" },
				{ status: 400 },
			);
		}

		if (!browserFingerprint || typeof browserFingerprint !== "string") {
			return NextResponse.json(
				{ valid: false, reason: "浏览器指纹不能为空" },
				{ status: 400 },
			);
		}

		// 获取用户IP
		const userIp = getClientIp(request);

		// 验证token
		const result = await validateApiKey(token, browserFingerprint, userIp);

		if (result.valid) {
			return NextResponse.json({
				valid: true,
				message: "Token验证成功",
				record: {
					orderNumber: result.record?.orderNumber,
					firstIssuedTime: result.record?.firstIssuedTime,
					lastFingerprintUpdateTime: result.record?.lastFingerprintUpdateTime,
				},
			});
		} else {
			return NextResponse.json({
				valid: false,
				reason: result.reason || "Token验证失败",
			});
		}
	} catch (error) {
		console.error("Token验证失败:", error);
		return NextResponse.json(
			{ valid: false, reason: "服务器内部错误，请稍后重试" },
			{ status: 500 },
		);
	}
}

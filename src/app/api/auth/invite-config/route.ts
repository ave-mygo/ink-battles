import { NextResponse } from "next/server";
import { getInviteCodeConfig } from "@/config";

/**
 * 获取邀请码配置
 * 返回是否需要邀请码注册
 */
export async function GET() {
	const config = getInviteCodeConfig();
	return NextResponse.json(config);
}

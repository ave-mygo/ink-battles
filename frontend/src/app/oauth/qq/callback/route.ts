import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createOAuthCallbackUrl } from "@/utils/auth/oauth-server";

export async function GET(request: NextRequest) {
	return NextResponse.redirect(createOAuthCallbackUrl(request.url, "/api/v2/rpc/oauth.qqCallback"));
}

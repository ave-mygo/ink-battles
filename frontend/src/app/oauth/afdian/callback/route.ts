import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	url.pathname = "/api/v2/rpc/oauth.afdianCallback";
	return NextResponse.redirect(url);
}

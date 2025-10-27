import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get("auth-token")?.value;

	if (pathname.startsWith("/dashboard")) {
		if (!token) {
			return NextResponse.rewrite(new URL("/signin", request.url));
		}
	}

	if ((pathname.startsWith("/signin") || pathname.startsWith("/signup")) && token) {
		return NextResponse.rewrite(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/signin", "/signup"],
};

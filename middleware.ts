import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get("auth-token")?.value;

	// 保护 /dashboard 路径
	if (pathname.startsWith("/dashboard")) {
		if (!token) {
			return NextResponse.redirect(new URL("/signin", request.url));
		}
	}

	// 已登录用户访问 /signin 或 /signup 跳转到首页
	if ((pathname === "/signin" || pathname === "/signup") && token) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/signin", "/signup"],
};

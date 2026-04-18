export const mapError = (error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	if (message === "UNAUTHORIZED") {
		return Response.json({ success: false, message: "未登录" }, { status: 401 });
	}
	if (message === "INVALID_ORIGIN") {
		return Response.json({ success: false, message: "请求来源无效" }, { status: 403 });
	}
	if (message === "RATE_LIMITED") {
		return Response.json({ success: false, message: "请求过于频繁，请稍后再试" }, { status: 429 });
	}
	console.error("[backend]", error);
	return Response.json({ success: false, message: "服务器错误" }, { status: 500 });
};

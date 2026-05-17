/**
 * 将错误映射为标准的 HTTP 响应
 * @param error - 捕获的错误对象
 * @returns 包含错误信息和对应状态码的 Response 对象
 */
export function mapError(error: unknown) {
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
  if (message === "PAYLOAD_TOO_LARGE") {
    return Response.json({ success: false, message: "请求内容过大，请分段提交" }, { status: 413 });
  }
  if (message === "SERVICE_BUSY") {
    return Response.json({ success: false, message: "分析服务繁忙，请稍后再试" }, { status: 503 });
  }
  console.error("[backend]", error);
  return Response.json({ success: false, message: "服务器错误" }, { status: 500 });
}

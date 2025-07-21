import type { NextRequest } from "next/server";

function randomToken(length = 32) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let token = "";
	for (let i = 0; i < length; i++) {
		token += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return token;
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	let count = Number(searchParams.get("count")) || 1;
	if (count < 1)
		count = 1;
	const tokens = Array.from({ length: count }, () => randomToken(32));
	// await Promise.all(tokens.map(token => db_insert("ink_battles", "apikeys", { token, used: false })));
	const txt = `注意当前生成的token没有录入数据库无法使用\n===================================\n${tokens.join("\n")}`;
	return new Response(txt, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}

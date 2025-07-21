import type { NextRequest } from "next/server";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config();

interface StatsDataItem {
	id: number;
	user_id: number;
	model_name: string;
	created_at: number;
	token_used: number;
	count: number;
	quota: number;
}

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const page = Number(searchParams.get("page")) || 1;
	const pageSize = Number(searchParams.get("pageSize")) || 20;

	const end = Math.floor(Date.now() / 1000);
	const start = end - (14 * 24 * 60 * 60); // 14天前

	try {
		// 获取当前页数据
		const response = await fetch(
			`https://newapi.yumetsuki.moe/api/log/self?p=${page}&page_size=${pageSize}&type=0&start_timestamp=${start}&end_timestamp=${end}&group=`,
			{
				headers: {
					"Cookie": process.env.API_COOKIE || "",
					"new-api-user": process.env.API_USER || "",
				},
			},
		);

		const data = await response.json();
		data.data.items = data.data.items.map((item: any) => {
			delete item.username;
			delete item.user_id;
			delete item.other;
			delete item.ip;
			delete item.group;
			delete item.content;
			delete item.channel;
			delete item.channel_name;
			delete item.token_name;
			return item;
		});

		// 获取统计数据（全部14天的数据）
		const statsResponse = await fetch(
			`https://newapi.yumetsuki.moe/api/data/self?start_timestamp=${start}&end_timestamp=${end}&default_time=hour`,
			{
				headers: {
					"Cookie": process.env.API_COOKIE || "",
					"new-api-user": process.env.API_USER || "",
				},
			},
		);

		const statsData = await statsResponse.json();
		statsData.data = statsData.data.map((item: any) => {
			delete item.username;
			delete item.user_id;
			delete item.other;
			delete item.ip;
			delete item.group;
			delete item.content;
			delete item.channel;
			delete item.channel_name;
			delete item.token_name;
			return item;
		});

		const items = statsData.data as StatsDataItem[];
		const stats = {
			// 总请求数：所有时间段的 count 之和
			totalRequests: items.reduce((sum: number, item: StatsDataItem) => sum + item.count, 0),
			// 总使用时间：所有时间段的 use_time 之和
			averageTime: data.data.items.length
				? data.data.items.reduce((sum: number, log: any) => sum + log.use_time, 0) / data.data.items.length
				: 0,
			successRate: data.data.items.length
				? (data.data.items.filter((log: any) => log.quota > 0).length / data.data.items.length) * 100
				: 0,
			// 总 tokens：所有时间段的 token_used 之和
			totalTokens: items.reduce((sum: number, item: StatsDataItem) => sum + item.token_used, 0),
		};
		return Response.json({
			success: true,
			...data.data,
			stats,
		});
	} catch (error) {
		console.error("Failed to fetch status:", error);
		return Response.json(
			{ success: false, message: "Failed to fetch status" },
			{ status: 500 },
		);
	}
}

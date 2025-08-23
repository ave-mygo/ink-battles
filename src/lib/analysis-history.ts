// 类型已迁移到 @/types/analysis
import type {
	AnalysisDetailItem,
	AnalysisHistoryItem,
	AnalysisHistoryResponse,
} from "@/types/analysis";
import process from "node:process";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { db_name } from "@/lib/constants";

import { db_find, db_read } from "@/lib/db";

export async function getAnalysisHistory(
	token: string,
	page: number = 1,
	limit: number = 10,
): Promise<AnalysisHistoryResponse> {
	try {
		// 验证JWT token
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			throw new Error("无效的令牌");
		}

		// 验证分页参数
		if (page < 1 || limit < 1 || limit > 100) {
			throw new Error("无效的分页参数");
		}

		const skip = (page - 1) * limit;

		// 获取用户的分析历史记录
		const [historyData, totalCount] = await Promise.all([
			db_read(
				db_name,
				"analysis_requests",
				{ userEmail },
				{
					sort: { timestamp: -1 },
					limit,
					skip,
				},
			),
			db_read(db_name, "analysis_requests", { userEmail }),
		]);

		// 解析结果数据
		const formattedData: AnalysisHistoryItem[] = historyData.map((item: any) => {
			let parsedResult;
			try {
				parsedResult = JSON.parse(item.result);
			} catch {
				parsedResult = {};
			}

			return {
				_id: item._id?.toString(),
				timestamp: item.timestamp,
				overallScore: item.overallScore || 0,
				title: parsedResult.title || "未知标题",
				ratingTag: parsedResult.ratingTag || "未知标签",
				summary: parsedResult.summary || "暂无概述",
				articleText: item.articleText || "",
				mode: item.mode || "default",
				tags: item.tags || parsedResult.tags || [],
			};
		});

		const total = totalCount.length;
		const hasMore = skip + limit < total;

		return {
			data: formattedData,
			total,
			page,
			limit,
			hasMore,
		};
	} catch (error) {
		console.error("获取分析历史失败:", error);
		throw new Error("获取历史记录失败");
	}
}

export async function getRecentAnalysisHistory(token: string): Promise<AnalysisHistoryItem[]> {
	const result = await getAnalysisHistory(token, 1, 3);
	return result.data;
}

export async function getAnalysisById(token: string, id: string): Promise<AnalysisDetailItem> {
	try {
		const secret = process.env.JWT_SECRET || "dev_secret_change_me";
		const payload = jwt.verify(token, secret) as { email?: string };
		const userEmail = payload.email;

		if (!userEmail) {
			throw new Error("无效的令牌");
		}

		// 查询当前用户的指定记录，避免越权
		const doc = await db_find(db_name, "analysis_requests", {
			_id: new ObjectId(id),
			userEmail,
		});

		if (!doc) {
			throw new Error("记录不存在");
		}

		let parsedResult: any = {};
		try {
			parsedResult = typeof doc.result === "string" ? JSON.parse(doc.result) : (doc.result || {});
		} catch {
			parsedResult = {};
		}

		const detail: AnalysisDetailItem = {
			_id: doc._id?.toString(),
			timestamp: doc.timestamp,
			overallScore: doc.overallScore || parsedResult.overallScore || 0,
			title: parsedResult.title || "未知标题",
			ratingTag: parsedResult.ratingTag || "未知标签",
			summary: parsedResult.summary || "暂无概述",
			articleText: doc.articleText || "",
			mode: doc.mode || "default",
			tags: doc.tags || parsedResult.tags || [],
			analysisResult: {
				overallScore: doc.overallScore || parsedResult.overallScore || 0,
				overallAssessment: parsedResult.overallAssessment || "",
				title: parsedResult.title || "未知标题",
				ratingTag: parsedResult.ratingTag || "未知标签",
				summary: parsedResult.summary || "暂无概述",
				tags: doc.tags || parsedResult.tags || [],
				dimensions: parsedResult.dimensions || [],
				strengths: parsedResult.strengths || [],
				improvements: parsedResult.improvements || [],
			},
		};

		return detail;
	} catch (error) {
		console.error("按ID获取分析记录失败:", error);
		throw new Error("获取记录失败");
	}
}

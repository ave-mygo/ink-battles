/**
 * 历史记录相关的服务器端工具函数
 */

"use server";

import type { DatabaseAnalysisRecord } from "@/types/database/analysis_requests";
import { db_name, db_table } from "@/lib/constants";
import { db_count, db_find, db_findById, db_read, db_update } from "@/lib/db";
import { getCurrentUserInfo, getUserAvatarUrl } from "@/utils/auth/server";
import "server-only";

/**
 * 分享者公开信息
 */
export interface SharerPublicInfo {
	/** 用户昵称（脱敏邮箱或默认名称） */
	displayName: string;
	/** 用户头像 URL */
	avatarUrl: string;
	/** 用户签名 */
	bio?: string | null;
}

/**
 * 序列化数据库记录为纯对象
 * 将 MongoDB ObjectId 和 Date 等特殊对象转换为客户端可用的简单值
 * @param record 数据库记录
 * @returns 序列化后的纯对象
 */
function serializeRecord(record: unknown): DatabaseAnalysisRecord {
	return JSON.parse(JSON.stringify(record));
}

/**
 * 序列化多条数据库记录
 * @param records 数据库记录数组
 * @returns 序列化后的纯对象数组
 */
function serializeRecords(records: unknown[]): DatabaseAnalysisRecord[] {
	return JSON.parse(JSON.stringify(records));
}

/**
 * 获取用户的分析历史记录列表
 * @param page 页码（从 1 开始）
 * @param limit 每页记录数（默认 10，最大 50）
 * @returns 历史记录列表及分页信息
 */
export async function getUserAnalysisHistory(
	page: number = 1,
	limit: number = 10,
): Promise<{
	success: boolean;
	data?: {
		records: DatabaseAnalysisRecord[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
	message?: string;
}> {
	// 验证用户身份
	const user = await getCurrentUserInfo();
	if (!user) {
		return { success: false, message: "未登录" };
	}

	// 参数验证
	const validatedLimit = Math.min(Math.max(1, limit), 50);
	const validatedPage = Math.max(1, page);
	const skip = (validatedPage - 1) * validatedLimit;

	try {
		// 获取总记录数
		const total = await db_count(db_name, db_table, { uid: user.uid });

		// 获取分页记录
		const records = await db_read(
			db_name,
			db_table,
			{ uid: user.uid },
			{
				sort: { timestamp: -1 }, // 按时间降序
				skip,
				limit: validatedLimit,
			},
		);

		const totalPages = Math.ceil(total / validatedLimit);

		return {
			success: true,
			data: {
				records: serializeRecords(records),
				total,
				page: validatedPage,
				limit: validatedLimit,
				totalPages,
			},
		};
	} catch (error) {
		console.error("获取历史记录失败:", error);
		return { success: false, message: "获取历史记录失败，请稍后重试" };
	}
}

/**
 * 获取单条分析记录详情（需验证所有权）
 * @param recordId 记录 ID
 * @returns 分析记录详情
 */
export async function getAnalysisRecordById(recordId: string): Promise<{
	success: boolean;
	data?: DatabaseAnalysisRecord;
	message?: string;
}> {
	// 验证用户身份
	const user = await getCurrentUserInfo();
	if (!user) {
		console.error("[getAnalysisRecordById] 用户未登录");
		return { success: false, message: "未登录" };
	}

	try {
		// 查询记录
		const record = await db_findById(db_name, db_table, recordId);

		if (!record) {
			console.error("[getAnalysisRecordById] 记录不存在");
			return { success: false, message: "记录不存在" };
		}

		// 验证所有权
		if (record.uid !== user.uid) {
			console.error("[getAnalysisRecordById] 权限不匹配", {
				recordUid: record.uid,
				userUid: user.uid,
			});
			return { success: false, message: "无权访问此记录" };
		}

		return {
			success: true,
			data: serializeRecord(record),
		};
	} catch (error) {
		console.error("[getAnalysisRecordById] 异常:", error);
		return { success: false, message: "获取记录详情失败，请稍后重试" };
	}
}

/**
 * 获取公开分享的分析记录（无需身份验证）
 * @param recordId 记录 ID
 * @returns 公开的分析记录（移除敏感信息）和分享者信息
 */
export async function getPublicAnalysisRecord(recordId: string): Promise<{
	success: boolean;
	data?: DatabaseAnalysisRecord;
	sharer?: SharerPublicInfo;
	message?: string;
}> {
	try {
		// 查询记录
		const record = await db_findById(db_name, db_table, recordId);

		if (!record) {
			return { success: false, message: "记录不存在" };
		}

		// 检查是否公开
		if (!record.settings?.public) {
			return { success: false, message: "该分析记录未公开分享" };
		}

		// 获取分享者信息
		let sharer: SharerPublicInfo | undefined;
		if (record.uid) {
			const uid = typeof record.uid === "string" ? Number.parseInt(record.uid, 10) : record.uid;
			if (!Number.isNaN(uid)) {
				// 获取用户信息
				const user = await db_find(db_name, "users", { uid });
				if (user) {
					// 生成显示名称：优先使用昵称，否则脱敏邮箱
					let displayName = "匿名用户";
					if (user.nickname) {
						displayName = user.nickname;
					} else if (user.email) {
						// 邮箱脱敏：abc@example.com -> a**@example.com
						const [localPart, domain] = user.email.split("@");
						if (localPart && domain) {
							displayName = `${localPart.charAt(0)}${"*".repeat(Math.min(localPart.length - 1, 3))}@${domain}`;
						}
					}

					// 获取头像
					const avatarUrl = await getUserAvatarUrl(uid);

					sharer = {
						displayName,
						avatarUrl,
						bio: user.bio || null,
					};
				}
			}
		}

		// 移除敏感信息
		const publicRecord = {
			...record,
			metadata: {
				...record.metadata,
				ip: null,
				fingerprint: null,
			},
		};

		return {
			success: true,
			data: serializeRecord(publicRecord),
			sharer,
		};
	} catch (error) {
		console.error("获取公开记录失败:", error);
		return { success: false, message: "获取记录失败，请稍后重试" };
	}
}

/**
 * 切换记录的公开状态
 * @param recordId 记录 ID
 * @param isPublic 是否公开
 * @returns 更新结果
 */
export async function toggleRecordPublic(
	recordId: string,
	isPublic: boolean,
): Promise<{
	success: boolean;
	data?: { public: boolean };
	message?: string;
}> {
	// 验证用户身份
	const user = await getCurrentUserInfo();
	if (!user) {
		return { success: false, message: "未登录" };
	}

	try {
		// 查询记录并验证所有权
		const record = await db_findById(db_name, db_table, recordId);

		if (!record) {
			return { success: false, message: "记录不存在" };
		}

		if (record.uid !== user.uid) {
			return { success: false, message: "无权修改此记录" };
		}

		// 更新公开状态
		const updateResult = await db_update(
			db_name,
			db_table,
			{ _id: record._id },
			{ $set: { "settings.public": isPublic } },
		);

		if (!updateResult) {
			return { success: false, message: "更新失败" };
		}

		return {
			success: true,
			data: { public: isPublic },
			message: isPublic ? "已设为公开" : "已设为私密",
		};
	} catch (error) {
		console.error("切换公开状态失败:", error);
		return { success: false, message: "操作失败，请稍后重试" };
	}
}

/**
 * 获取最近的分析记录（用于 Dashboard 首页）
 * @param limit 返回记录数（默认 5）
 * @returns 最近的分析记录列表
 */
export async function getRecentAnalysisHistory(limit: number = 5): Promise<{
	success: boolean;
	data?: DatabaseAnalysisRecord[];
	message?: string;
}> {
	const result = await getUserAnalysisHistory(1, Math.min(limit, 10));

	if (!result.success || !result.data) {
		return { success: false, message: result.message };
	}

	return {
		success: true,
		data: result.data.records,
	};
}

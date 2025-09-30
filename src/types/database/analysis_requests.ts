/**
 * 数据库记录相关类型定义
 */

import type { AnalysisInput, AnalysisOutput } from "@/types/callback/ai";

/**
 * 数据库文章分析记录完整结构
 * 对应 analysis_requests 集合的文档结构
 */
export interface DatabaseAnalysisRecord {
	/** MongoDB 文档 ID */
	_id?: string;
	/** 用户ID（可能为空，未登录用户） */
	uid: string | null;
	/** 文章相关数据 */
	article: {
		/** 分析输入参数 */
		input: AnalysisInput;
		/** 分析输出结果 */
		output: AnalysisOutput;
	};
	/** 元数据信息 */
	metadata: {
		/** 文章内容的SHA1哈希 */
		sha1: string;
		/** 客户端IP地址 */
		ip: string | null;
		/** 浏览器指纹 */
		fingerprint: string | null;
	};
	/** 记录时间戳 */
	timestamp: string;
}

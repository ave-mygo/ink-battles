/**
 * 数据库后台分析任务记录结构
 */

export type AnalysisTaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface DatabaseAnalysisTask {
	/** MongoDB 文档 ID */
	_id?: string;
	/** 用户ID（可能为空，未登录用户） */
	uid: string | null;
	/** 任务状态 */
	status: AnalysisTaskStatus;
	/** 原文内容和模式等输入信息 */
	input: {
		articleText: string;
		mode: string;
		modelId?: string;
		search?: {
			searchResults: string;
			searchWebPages?: string;
		};
	};
	/** 元数据信息 */
	metadata: {
		/** 文章内容的SHA1哈希 */
		sha1: string;
		/** 客户端IP地址 */
		ip: string | null;
		/** 浏览器指纹 */
		fingerprint: string | null;
		/** 模型名称 */
		modelName?: string;
		/** 服务器Session */
		session: string;
	};
	/** 创建时间戳 */
	createdAt: string;
	/** 更新时间戳 */
	updatedAt: string;
	/** 计费状态 */
	billing?: {
		deducted: boolean;
		deductedFrom: "grant" | "paid" | null;
		deductedAt?: string;
		completedAt?: string;
		refunded?: boolean;
		refundedAt?: string;
		refundReason?: "failed" | "cancelled";
		refundBalanceApplied?: boolean;
	};
	/** 错误信息（如果失败） */
	error?: string;
	/** 分析结果的记录ID (关联到 analysis_requests 表) */
	resultId?: string;
}

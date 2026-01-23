/**
 * 配置相关类型定义
 * 用于客户端和服务器端共享的配置类型
 */

/**
 * 评分模型配置类型（客户端安全版本）
 * 不包含 api_key 和 base_url 等敏感信息
 */
export interface GradingModelConfig {
	/** 稳定模型ID */
	id: string;
	/** 模型显示名称 */
	name: string;
	/** 模型标识符 */
	model: string;
	/** 模型描述 */
	description: string;
	/** 是否启用 */
	enabled: boolean;
	/** 是否为高级模型 */
	premium?: boolean;
	/** 模型特性列表 */
	features: string[];
	/** 模型优势列表 */
	advantages?: string[];
	/** 使用场景说明 */
	usageScenario?: string;
	/** 隐私警告信息（可选） */
	warning?: string;
}

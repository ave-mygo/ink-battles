/**
 * 配置管理模块
 * 从 config-loader 加载配置并提供便捷的访问函数
 * @server-only 此模块仅在服务器端运行
 */

import type {
	FriendLinkConfig,
	GradingModelConfig,
	RuntimeConfig,
	SystemModelConfig,
} from "@/lib/config-loader";
import {
	clearConfigCache as clearCache,
	loadConfig,
} from "@/lib/config-loader";

import "server-only";

// 使用别名导出类型，保持向后兼容
type Config = RuntimeConfig;

// 懒加载配置实例
let configInstance: RuntimeConfig | null = null;

/**
 * 获取配置实例（懒加载）
 */
const getConfigInstance = (): RuntimeConfig => {
	if (!configInstance) {
		configInstance = loadConfig();
	}
	return configInstance;
};

/**
 * 获取评分模型的稳定ID
 * @param model 评分模型配置
 * @returns 稳定ID
 */
const getGradingModelId = (model: GradingModelConfig): string => {
	return model.id ?? model.model;
};

/**
 * 获取完整配置对象
 */
export const getConfig = (): Config => {
	return getConfigInstance();
};

/**
 * 清除配置缓存（用于热重载）
 */
export const clearConfigCache = (): void => {
	configInstance = null;
	clearCache();
};

/**
 * 获取所有可用的评分模型
 */
export const getAvailableGradingModels = (): GradingModelConfig[] => {
	const config = getConfigInstance();
	return config.grading_models.filter((model: GradingModelConfig) => model.enabled);
};

/**
 * 获取特定评分模型（通过索引）
 */
export const getGradingModel = (modelIndex: string | number): GradingModelConfig | null => {
	const config = getConfigInstance();
	const index = typeof modelIndex === "string" ? Number.parseInt(modelIndex, 10) : modelIndex;
	if (Number.isNaN(index) || index < 0 || index >= config.grading_models.length) {
		return null;
	}
	const model = config.grading_models[index];
	return model?.enabled ? model : null;
};

/**
 * 获取特定评分模型（通过稳定ID）
 * @param id 评分模型ID
 * @returns 匹配的评分模型或 null
 */
export const getGradingModelById = (id: string): GradingModelConfig | null => {
	const config = getConfigInstance();
	const model = config.grading_models.find(item => getGradingModelId(item) === id);
	return model?.enabled ? model : null;
};

/**
 * 获取系统模型配置
 */
export const getSystemModel = (type: keyof Config["system_models"]): SystemModelConfig | null => {
	const config = getConfigInstance();
	return config.system_models[type] || null;
};

/**
 * 获取友情链接配置
 */
export const getFriendLinks = (): FriendLinkConfig[] => {
	const config = getConfigInstance();
	return config.friends;
};

/**
 * 检查是否需要邀请码注册
 * @returns 是否需要邀请码
 */
export const isInviteCodeRequired = (): boolean => {
	const config = getConfigInstance();
	return config.registration?.invite_code_required ?? false;
};

/**
 * 获取邀请码的注册配置状态（用于客户端 API）
 * @returns 是否需要邀请码
 */
export const getInviteCodeConfig = (): { required: boolean } => {
	const required = isInviteCodeRequired();
	return { required };
};

// 重新导出类型
export { loadConfig };
export type { Config, FriendLinkConfig, GradingModelConfig, SystemModelConfig };

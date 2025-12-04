/**
 * 运行时配置加载器
 * 从 TOML 文件动态加载配置，支持容器部署时挂载外部配置
 * @server-only 此模块仅在服务器端运行
 */

import fs from "node:fs";

import path from "node:path";
import process from "node:process";
import toml from "toml";
import "server-only";

// 配置类型定义
interface SystemModelConfig {
	api_key: string;
	base_url: string;
	model?: string;
}

interface GradingModelConfig {
	name: string;
	api_key: string;
	base_url: string;
	model: string;
	description: string;
	enabled: boolean;
	premium?: boolean;
	features: string[];
	advantages?: string[];
	usageScenario?: string;
}

interface FriendLinkConfig {
	title: string;
	description: string;
	url: string;
}

interface RuntimeConfig {
	system_models: {
		validator: SystemModelConfig;
		search: SystemModelConfig;
	};
	default_model: number;
	grading_models: GradingModelConfig[];
	mongodb: {
		host: string;
		port: number;
		user?: string;
		password?: string;
	};
	afdian: {
		api_token: string;
		user_id: string;
		client_id: string;
		client_secret: string;
		redirect_uri: string;
	};
	api: {
		key: string;
		user: number;
	};
	email: {
		host: string;
		port: number;
		user: string;
		password: string;
	};
	jwt: {
		secret: string;
	};
	app: {
		app_name: string;
		base_url: string;
		notice: {
			enabled: boolean;
			content: string;
			link: string;
		};
	};
	friends: FriendLinkConfig[];
}

// 配置缓存
let cachedConfig: RuntimeConfig | null = null;

/**
 * 获取配置文件路径
 * 优先级: CONFIG_PATH 环境变量 > /app/config.toml > 项目根目录/config.toml
 */
function getConfigPath(): string {
	// 1. 环境变量指定的路径
	if (process.env.CONFIG_PATH) {
		return process.env.CONFIG_PATH;
	}

	// 2. 容器内标准路径
	const containerPath = "/app/config.toml";
	if (fs.existsSync(containerPath)) {
		return containerPath;
	}

	// 3. 项目根目录
	const rootPath = path.join(process.cwd(), "config.toml");
	if (fs.existsSync(rootPath)) {
		return rootPath;
	}

	// 4. 示例配置（开发用）
	const examplePath = path.join(process.cwd(), "config.example.toml");
	if (fs.existsSync(examplePath)) {
		console.warn("[config-loader] 警告: 使用示例配置文件，请创建 config.toml");
		return examplePath;
	}

	throw new Error(
		"[config-loader] 找不到配置文件。请创建 config.toml 或设置 CONFIG_PATH 环境变量",
	);
}

/**
 * 加载并解析 TOML 配置
 */
export function loadConfig(): RuntimeConfig {
	// 返回缓存（生产环境）
	if (cachedConfig && process.env.NODE_ENV === "production") {
		return cachedConfig;
	}

	const configPath = getConfigPath();
	console.log(`[config-loader] 加载配置: ${configPath}`);

	try {
		const content = fs.readFileSync(configPath, "utf-8");
		const parsed = toml.parse(content) as RuntimeConfig;

		// 处理环境变量覆盖（支持敏感配置通过环境变量注入）
		if (process.env.MONGODB_HOST) {
			parsed.mongodb.host = process.env.MONGODB_HOST;
		}
		if (process.env.MONGODB_PORT) {
			parsed.mongodb.port = Number.parseInt(process.env.MONGODB_PORT, 10);
		}
		if (process.env.JWT_SECRET) {
			parsed.jwt.secret = process.env.JWT_SECRET;
		}
		if (process.env.APP_BASE_URL) {
			parsed.app.base_url = process.env.APP_BASE_URL;
		}

		cachedConfig = parsed;
		return parsed;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`[config-loader] 配置解析失败: ${error.message}`);
		}
		throw error;
	}
}

/**
 * 清除配置缓存（用于热重载）
 */
export function clearConfigCache(): void {
	cachedConfig = null;
}

export type { FriendLinkConfig, GradingModelConfig, RuntimeConfig, SystemModelConfig };

/**
 * =================================================================
 * |                    配置示例文件 (config.example.ts)                     |
 * =================================================================
 *
 * 说明:
 * 1. 这是应用程序的配置文件模板。
 * 2. 请不要直接在此文件上修改。
 * 3. 复制此文件并重命名为 `config.ts`。
 * 4. 在 `config.ts` 文件中，将所有占位符 (如 'your_api_key_here', 'localhost' 等)
 *    替换为您自己的实际配置信息。
 * 5. `config.ts` 文件包含了敏感信息，请务必将其添加到 `.gitignore` 文件中，
 *    以避免将您的密钥和密码提交到版本控制系统。
 *
 */

// 定义配置类型
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

interface Config {
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
}

// 配置数据
// 注意：此文件仅为配置示例，请勿将敏感信息直接写入并提交到版本控制。
// 建议使用环境变量或外部配置文件管理生产环境的敏感配置。
const config: Config = {
	system_models: {
		validator: {
			// 用于验证和核心处理的AI模型配置
			// 替换为你的API Key
			api_key: "sk-YOUR_VALIDATOR_API_KEY",
			// 替换为你的模型API基础URL
			base_url: "https://api.example.com/v1",
			// 可选，指定模型名称，例如 "gemini-2.5-flash", "gpt-4o"
			model: "gemini-2.5-flash",
		},
		search: {
			// 用于搜索功能的AI模型或服务配置
			// 替换为你的API Key
			api_key: "YOUR_SEARCH_API_KEY",
			// 替换为你的搜索服务API基础URL
			base_url: "https://s.jina.ai",
			// model在此场景下可能不需要，或由服务隐式指定
		},
	},
	// 默认启用的评分模型索引（根据grading_models数组的顺序，从0开始）
	// 例如，如果第一个模型是默认模型，则设置为 0
	default_model: 0,
	grading_models: [
		{
			// 评分模型配置示例 1
			name: "ChatGPT 5 Nano",
			base_url: "https://api.openai.com/v1", // 替换为实际的API基础URL
			api_key: "YOUR_CHATGPT_NANO_API_KEY", // 替换为你的API Key
			description: "专注于快速文本分析的轻量级模型，提供即时反馈和基础评析功能。",
			model: "gpt-5-nano-2025-08-07",
			enabled: true,
			premium: false,
			features: [
				"极致的响应速度",
				"轻量化设计",
				"基础文本分析",
				"即时反馈",
			],
			advantages: [
				"专为快速文本分析而设计，几乎没有等待延迟",
				"运行效率高，适合快速文本检查",
				"能够快速识别文本问题、评估流畅度并提供基础建议",
			],
			usageScenario: "定位于快速文本评析，适合对段落或短篇文本进行即时检查和分析，提供快速的文本质量反馈。",
		},
		// 可以添加更多评分模型配置
	],
	mongodb: {
		host: "localhost", // MongoDB主机地址
		port: 27017, // MongoDB端口
		user: undefined, // MongoDB用户名，如果不需要认证则保持 undefined
		password: undefined, // MongoDB密码，如果不需要认证则保持 undefined
	},
	afdian: {
		// 爱发电（Afdian）API配置，用于会员或赞助功能
		api_token: "YOUR_AFDIAN_API_TOKEN", // 替换为你的爱发电 API Token
		user_id: "YOUR_AFDIAN_USER_ID", // 替换为你的爱发电用户ID
		client_id: "YOUR_AFDIAN_CLIENT_ID", // 替换为你的爱发电 Client ID
		client_secret: "YOUR_AFDIAN_CLIENT_SECRET", // 替换为你的爱发电 Client Secret
		redirect_uri: "https://your-app.com/api/oauth/afdian", // 替换为你的回调URI
	},
	api: {
		// 应用程序内部API密钥，用于一些内部服务或与特定用户关联
		key: "YOUR_APP_API_KEY_SECRET", // 替换为你的应用程序API密钥
		user: 1, // 关联的内部用户ID
	},
	email: {
		// 邮件服务配置，用于发送通知、验证码等
		host: "smtp.example.com", // SMTP主机
		port: 465, // SMTP端口，常用 465 (SSL) 或 587 (TLS)
		user: "noreply@your-app.com", // 邮件账户用户名
		password: "YOUR_EMAIL_PASSWORD", // 邮件账户密码
	},
	jwt: {
		// JSON Web Token (JWT) 配置
		secret: "YOUR_JWT_SECRET_KEY", // 用于签发和验证JWT的密钥，请确保足够复杂和随机
	},
	app: {
		app_name: "Ink Battles", // 应用程序名称
		base_url: "https://your-app.com", // 应用程序的根URL
		notice: {
			enabled: true, // 是否启用网站公告
			content: "欢迎使用 Ink Battles！请查看最新公告。", // 公告内容
			link: "https://your-app.com/notice", // 公告链接
		},
	},
};

export const getConfig = (): Config => {
	return config;
};

// 工具函数：获取所有可用的评分模型
export const getAvailableGradingModels = (): GradingModelConfig[] => {
	return Object.values(config.grading_models).filter(model => model.enabled);
};

// 工具函数：获取特定评分模型
export const getGradingModel = (modelId: string): GradingModelConfig | null => {
	return config.grading_models.find(model => model.model === modelId) || null;
};

// 工具函数：获取系统模型配置
export const getSystemModel = (type: keyof Config["system_models"]): SystemModelConfig | null => {
	return config.system_models[type] || null;
};

export type { Config, GradingModelConfig, SystemModelConfig };

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
// -------------------------------------------------------------
// 导航与 FAQ 配置类型与常量（从组件拆分集中管理）
// -------------------------------------------------------------
import type { ComponentType } from "react";
import process from "node:process";
import { Link as LinkIcon, User } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

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
		// 根据环境选择 base_url：开发环境使用 http://localhost:3000，其他环境使用 https://ink-battles.rikki.top
		base_url: isDev ? "http://localhost:3000" : "https://ink-battles.rikki.top",
		notice: {
			enabled: true, // 是否启用网站公告
			content: "欢迎使用 Ink Battles！请查看最新公告。", // 公告内容
			link: isDev ? "http://localhost:3000" : "https://ink-battles.rikki.top", // 公告链接
		},
	},
};

/** 仪表盘侧边导航项类型 */
export interface DashboardNavItem {
	label: string;
	href: string;
	icon: ComponentType<{ className?: string }>;
}

/** FAQ 项类型 */
export interface FaqItemConfig {
	question: string;
	answer: string;
}

/** 仪表盘导航配置（从 DashboardLayoutClient 拆分） */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
	{ label: "用户信息", href: "/dashboard/profile", icon: User },
	{ label: "账号绑定与管理", href: "/dashboard/accounts", icon: LinkIcon },
];

/** About 页面 FAQ 配置（集中管理，便于复用与 SEO） */
export const ABOUT_FAQ_ITEMS: FaqItemConfig[] = [
	{
		question: "AI会替代创作者吗？本系统的立场是什么？",
		answer:
			"我们深刻理解关于AI是否会替代创作者的担忧，但我们始终坚信，创作本质上是一种源自人类独特情感、思想和体验的表达方式，这些是机器无法复制的。AI技术虽然在处理大量信息、提供灵感拓展和优化语言表达上展现出强大能力，但它仅是辅助和工具的角色，而非创作者的替代者。\n本系统的定位是为创作者提供智能支持，帮助他们更高效地探索创意、发现写作盲点、提升作品质量。我们致力于通过数据驱动的分析和客观反馈，激发您的潜力，而非取代您的独特声音和主观判断。作品的灵魂与情感依然深植于您的内心，是AI无法复制的人类经验和创造精神。\n换言之，AI是您创作旅程中的“助力翅膀”，帮助您飞得更高、更远，而驾驶这架“飞机”的永远是您自己。我们希望通过技术赋能，让创作变得更轻松、有趣，同时保留并尊重创作者作为艺术家的核心地位。未来，AI与人类创作者的协作将创造更加丰富、多样的文化表达，而非单方面的替代与冲突。",
	},
	{
		question: "什么是作家战力分析系统？",
		answer:
			"作家战力分析系统（Ink Battles）是一个专业的AI文本分析平台，专为创作者设计。我们通过先进的AI技术提供多维度写作评估、内容质量打分、风格分析和创作建议，帮助作家提升创作水平。支持小说、文章、剧本等多种文体分析。",
	},
	{
		question: "如何开始使用系统？",
		answer:
			"使用流程非常简单：1) 在首页的文本框中输入或粘贴您的作品内容；2) 根据您的需求选择不同的评分模式和AI模型；3) 点击“开始分析”，系统会实时处理并展示分析结果；4) 在结果页查看详细的多维度分析报告和改进建议。",
	},
	{
		question: "我的数据安全如何保障？",
		answer:
			"我们高度重视您的数据安全与隐私。您提交的文本和分析结果会按照行业标准进行加密存储，以供您查阅历史记录。我们承诺不会将您的数据用于任何未经授权的用途。同时，分析过程会调用第三方AI服务，您的文本会经过我们和第三方服务商处理，详情请参阅我们的用户条款。",
	},
	{
		question: "分析的准确性如何？",
		answer:
			"我们的分析由多个先进的AI模型（如OpenAI、Google等）提供支持，力求提供专业、客观的反馈。但AI的判断并非绝对，分析结果仅供参考。我们强烈建议您将AI报告作为创作的辅助工具，并结合自身的经验和判断来使用。",
	},
	{
		question: "系统提供哪些分析模式？",
		answer:
			"我们提供多种预设的分析模式，例如“整体质量评估”、“写作风格分析”、“情感倾向识别”等，以满足不同场景的需求。您可以在“评分模式”区域自由组合，定制最适合您的分析视角。",
	},
	{
		question: "用户权限和会员服务有什么区别？",
		answer:
			"我们为不同用户提供分级服务：游客有基础的分析字数和次数限制；注册用户可以获得更高的免费额度并保存历史记录；赞助成为会员后，您将享有几乎无限制的分析字数、调用高级AI模型的权限以及专属折扣。",
	},
	{
		question: "为什么部分高级功能或模型无法使用？",
		answer:
			"为了保证服务质量和可持续运营，部分高级AI模型或特定分析功能（如“AI内容鉴别”）仅对会员用户或在特定活动期间开放。我们也在不断开发和迭代新功能，敬请期待。",
	},
	{
		question: "项目是否开源？我该如何参与？",
		answer:
			"是的，本项目以BSL 1.1 + AGPL-3.0双重许可证开源。我们欢迎开发者进行学习、二次开发或贡献代码。您可以在非生产环境中免费使用。如果您希望参与贡献或反馈问题，可以通过GitHub提交Issue或加入我们的社区进行讨论。",
	},
	{
		question: "如何联系我们或获得技术支持？",
		answer:
			"如果您遇到任何问题或有功能建议，可以通过以下方式联系我们：1) 在我们GitHub仓库的Issues页面提交问题；2) 加入我们的官方QQ群（625618470）与其他用户和开发者交流。我们非常珍视用户的反馈。",
	},
];

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

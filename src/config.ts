import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import TOML from "@iarna/toml";

// 定义配置类型
interface Config {
	openai: {
		reviewer: {
			api_key: string;
			base_url: string;
			model: string;
		};
		grader: {
			api_key: string;
			base_url: string;
			model: string;
		};
		pro: {
			api_key: string;
			base_url: string;
			model: string;
		};
	};
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
		base_url: string;
	};
}

// 默认配置
const defaultConfig: Config = {
	openai: {
		reviewer: {
			api_key: "",
			base_url: "https://api.openai.com/v1",
			model: "gpt-3.5-turbo",
		},
		grader: {
			api_key: "",
			base_url: "https://api.openai.com/v1",
			model: "gpt-4",
		},
		pro: {
			api_key: "",
			base_url: "https://api.openai.com/v1",
			model: "gpt-4",
		},
	},
	mongodb: {
		host: "192.168.3.4",
		port: 27017,
		user: undefined,
		password: undefined,
	},
	afdian: {
		api_token: "",
		user_id: "",
		client_id: "",
		client_secret: "",
		redirect_uri: "",
	},
	api: {
		key: "",
		user: 0,
	},
	email: {
		host: "smtp.gmail.com",
		port: 587,
		user: "",
		password: "",
	},
	jwt: {
		secret: "default_secret",
	},
	app: {
		base_url: "http://localhost:3000",
	},
};

let config: Config | null = null;

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
	const result = { ...target };

	for (const key in source) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			const sourceValue = source[key];
			const targetValue = result[key];

			if (sourceValue !== null && typeof sourceValue === "object" && !Array.isArray(sourceValue)
				&& targetValue !== null && typeof targetValue === "object" && !Array.isArray(targetValue)) {
				result[key] = deepMerge(targetValue, sourceValue);
			} else if (sourceValue !== undefined) {
				result[key] = sourceValue as T[Extract<keyof T, string>];
			}
		}
	}

	return result;
}

function getConfigFromEnv(): Partial<Config> {
	return {
		openai: {
			reviewer: {
				api_key: process.env.OPENAI_API_KEY_1 || defaultConfig.openai.reviewer.api_key,
				base_url: process.env.OPENAI_BASE_URL_1 || defaultConfig.openai.reviewer.base_url,
				model: process.env.OPENAI_MODEL_1 || "gemini-2.5-flash",
			},
			grader: {
				api_key: process.env.OPENAI_API_KEY_2 || defaultConfig.openai.grader.api_key,
				base_url: process.env.OPENAI_BASE_URL_2 || defaultConfig.openai.grader.base_url,
				model: process.env.OPENAI_MODEL_2 || "gemini-2.5-pro",
			},
			pro: {
				api_key: process.env.OPENAI_API_KEY_3 || defaultConfig.openai.pro.api_key,
				base_url: process.env.OPENAI_BASE_URL_3 || defaultConfig.openai.pro.base_url,
				model: process.env.OPENAI_MODEL_3 || "gemini-2.5-pro",
			},
		},
		mongodb: {
			host: process.env.MONGO_HOST || defaultConfig.mongodb.host,
			port: Number.parseInt(process.env.MONGO_PORT || String(defaultConfig.mongodb.port)),
			user: process.env.MONGO_USER || defaultConfig.mongodb.user,
			password: process.env.MONGO_PASS || defaultConfig.mongodb.password,
		},
		afdian: {
			api_token: process.env.AFDIAN_API_TOKEN || defaultConfig.afdian.api_token,
			user_id: process.env.AFDIAN_USER_ID || defaultConfig.afdian.user_id,
			client_id: process.env.AFDIAN_CLIENT_ID || defaultConfig.afdian.client_id,
			client_secret: process.env.AFDIAN_CLIENT_SECRET || defaultConfig.afdian.client_secret,
			redirect_uri: process.env.AFDIAN_REDIRECT_URI || defaultConfig.afdian.redirect_uri,
		},
		api: {
			key: process.env.API_KEY || defaultConfig.api.key,
			user: Number.parseInt(process.env.API_USER || String(defaultConfig.api.user)),
		},
		email: {
			host: process.env.EMAIL_HOST || defaultConfig.email.host,
			port: Number.parseInt(process.env.EMAIL_PORT || String(defaultConfig.email.port)),
			user: process.env.EMAIL_USER || defaultConfig.email.user,
			password: process.env.EMAIL_PASS || defaultConfig.email.password,
		},
		jwt: {
			secret: process.env.JWT_SECRET || defaultConfig.jwt.secret,
		},
		app: {
			base_url: process.env.NEXT_PUBLIC_BASE_URL || defaultConfig.app.base_url,
		},
	};
}

function getConfig(): Config {
	if (config) {
		return config;
	}

	const configPath = path.join(process.cwd(), "config.toml");

	try {
		if (fs.existsSync(configPath)) {
			const tomlContent = fs.readFileSync(configPath, "utf-8");
			const tomlConfig = TOML.parse(tomlContent) as Partial<Config>;
			config = deepMerge(defaultConfig, tomlConfig);
			return config;
		}
	} catch (error) {
		console.warn("读取 config.toml 失败，回退到环境变量:", error);
	}

	const envConfig = getConfigFromEnv();
	config = deepMerge(defaultConfig, envConfig);

	return config;
}

export { getConfig };
export type { Config };

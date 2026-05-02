import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import toml from "toml";
import { env } from "./env";

export interface RuntimeConfig {
	system_models: Record<string, { api_key: string; base_url: string; model?: string }>;
	default_model: number;
	server: {
		max_json_body_bytes: number;
		allowed_origins: string[];
	};
	analysis: {
		max_article_chars: number;
		max_output_chars: number;
		max_concurrent_tasks: number;
		max_queued_tasks: number;
		max_active_tasks_per_user: number;
		max_mode_chars: number;
		max_fingerprint_chars: number;
		guest_result_ttl_minutes: number;
	};
	grading_models: Array<{
		id?: string;
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
		warning?: string;
		supports_json_mode?: boolean;
	}>;
	mongodb: { host: string; port: number; user?: string; password?: string; directConnection?: boolean };
	afdian: { api_token: string; user_id: string; client_id: string; client_secret: string; redirect_uri: string };
	api: { key: string; user: number; base_url: string };
	email: { host: string; port: number; user: string; password: string };
	jwt: { secret: string };
	registration: { invite_code_required: boolean };
	app: { app_name: string; base_url: string; notice: { enabled: boolean; content: string; link: string } };
	friends: Array<{ title: string; description: string; url: string }>;
}

let cachedConfig: RuntimeConfig | null = null;

const MINIMUM_SECRET_BYTES = 32;
const FORBIDDEN_JWT_SECRETS = new Set(["dev_secret_change_me"]);
const LOCAL_APP_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const assertRequiredString = (value: unknown, name: string) => {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${name} 配置缺失`);
	}
	return value.trim();
};

const applyRuntimeDefaults = (config: RuntimeConfig) => {
	config.server ??= {
		max_json_body_bytes: 4 * 1024 * 1024,
		allowed_origins: ["http://localhost:3001"],
	};
	config.server.max_json_body_bytes ??= 4 * 1024 * 1024;
	config.server.allowed_origins = (config.server.allowed_origins ?? ["http://localhost:3001"])
		.map(origin => String(origin).trim())
		.filter(Boolean);

	config.analysis ??= {
		max_article_chars: 400_000,
		max_output_chars: 1024 * 1024,
		max_concurrent_tasks: 2,
		max_queued_tasks: 20,
		max_active_tasks_per_user: 5,
		max_mode_chars: 200,
		max_fingerprint_chars: 128,
		guest_result_ttl_minutes: 15,
	};
	config.analysis.max_article_chars ??= 400_000;
	config.analysis.max_output_chars ??= 1024 * 1024;
	config.analysis.max_concurrent_tasks ??= 2;
	config.analysis.max_queued_tasks ??= 20;
	config.analysis.max_active_tasks_per_user ??= 5;
	config.analysis.max_mode_chars ??= 200;
	config.analysis.max_fingerprint_chars ??= 128;
	config.analysis.guest_result_ttl_minutes ??= 15;
};

const validateRuntimeConfig = (config: RuntimeConfig) => {
	applyRuntimeDefaults(config);

	const jwtSecret = assertRequiredString(config.jwt?.secret, "jwt.secret");
	if (FORBIDDEN_JWT_SECRETS.has(jwtSecret) || new TextEncoder().encode(jwtSecret).byteLength < MINIMUM_SECRET_BYTES) {
		throw new Error("jwt.secret 必须是至少 32 字节的高熵随机值");
	}
	config.jwt.secret = jwtSecret;

	const appBaseUrl = assertRequiredString(config.app?.base_url, "app.base_url");
	const parsedAppBaseUrl = new URL(appBaseUrl);
	if (Bun.env.NODE_ENV === "production" && LOCAL_APP_HOSTNAMES.has(parsedAppBaseUrl.hostname)) {
		throw new Error("生产环境 app.base_url 不能使用 localhost，请设置为公网域名");
	}
	config.app.base_url = parsedAppBaseUrl.origin + parsedAppBaseUrl.pathname.replace(/\/$/, "");

	const afdianRedirectUri = assertRequiredString(config.afdian?.redirect_uri, "afdian.redirect_uri");
	config.afdian.redirect_uri = new URL(afdianRedirectUri).toString();
};

/**
 * 加载运行时配置，后端是唯一读取敏感配置的服务。
 */
export const getConfig = (): RuntimeConfig => {
	if (cachedConfig)
		return cachedConfig;

	const candidates = [
		Bun.env.CONFIG_PATH,
		env.configPath,
		"/app/config.toml",
		join(process.cwd(), "config.toml"),
		join(process.cwd(), "config.example.toml"),
	].filter(Boolean) as string[];

	const configPath = candidates.find(path => existsSync(path));
	if (!configPath)
		throw new Error("找不到 config.toml 或 config.example.toml");

	const parsed = toml.parse(readFileSync(configPath, "utf-8")) as RuntimeConfig;
	if (Bun.env.MONGODB_HOST)
		parsed.mongodb.host = Bun.env.MONGODB_HOST;
	if (Bun.env.MONGODB_PORT)
		parsed.mongodb.port = Number(Bun.env.MONGODB_PORT) || parsed.mongodb.port;
	if (Bun.env.JWT_SECRET)
		parsed.jwt.secret = Bun.env.JWT_SECRET;
	if (Bun.env.APP_BASE_URL)
		parsed.app.base_url = Bun.env.APP_BASE_URL;

	validateRuntimeConfig(parsed);
	cachedConfig = parsed;
	return parsed;
};

export const getPublicConfig = () => {
	const config = getConfig();
	return {
		app: config.app,
		friends: config.friends,
		registration: config.registration,
		gradingModels: config.grading_models.filter(model => model.enabled).map(model => ({
			id: model.id ?? model.model,
			name: model.name,
			description: model.description,
			premium: model.premium === true,
			features: model.features,
			advantages: model.advantages,
			usageScenario: model.usageScenario,
			warning: model.warning,
		})),
	};
};

export const getGradingModelById = (id: string) => {
	const config = getConfig();
	return config.grading_models.find(model => (model.id ?? model.model) === id && model.enabled) ?? null;
};

export const getServerConfig = () => getConfig().server;

export const getAnalysisConfig = () => getConfig().analysis;

export const getAppOrigin = () => new URL(getConfig().app.base_url).origin;

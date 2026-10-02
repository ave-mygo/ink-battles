import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import toml from "toml";
import { env } from "./env";

export interface SystemModelCredential {
  api_key: string;
  base_url: string;
  model?: string;
  enabled?: boolean;
  name?: string;
}

export interface SystemEmbeddingModelConfig extends Omit<SystemModelCredential, "model"> {
  model: string;
}

export interface SystemRerankModelConfig extends Omit<SystemModelCredential, "model"> {
  model: string;
}

export interface SystemModelsConfig extends Record<string, unknown> {
  embedding?: SystemEmbeddingModelConfig;
  rerank?: SystemRerankModelConfig;
  remark: Record<string, SystemModelCredential>;
}

export interface RuntimeConfig {
  system_models: SystemModelsConfig;
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
    max_sponsor_queued_tasks: number;
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
  admin?: { users?: number[] };
  registration: { invite_code_required: boolean };
  app: { app_name: string; base_url: string; notice: { enabled: boolean; content: string; link: string } };
  friends: Array<{ title: string; description: string; url: string }>;
}

let cachedConfig: RuntimeConfig | null = null;

const MINIMUM_SECRET_BYTES = 32;
const FORBIDDEN_JWT_SECRETS = new Set(["dev_secret_change_me"]);
const LOCAL_APP_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const isSystemModelCredential = (value: unknown): value is SystemModelCredential =>
  typeof value === "object"
  && value !== null
  && typeof (value as Partial<SystemModelCredential>).api_key === "string"
  && typeof (value as Partial<SystemModelCredential>).base_url === "string";

/**
 * 断言配置值为非空字符串，否则抛出错误
 * @param value - 待检查的配置值
 * @param name - 配置项名称（用于错误信息）
 * @returns 去除首尾空白后的字符串
 */
function assertRequiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} 配置缺失`);
  }
  return value.trim();
}

/**
 * 应用运行时配置的默认值
 * 为 server、analysis 等配置项补充缺失的默认值
 * @param config - 运行时配置对象
 */
function applyRuntimeDefaults(config: RuntimeConfig) {
  config.system_models ??= {} as SystemModelsConfig;
  const rawSystemModels = config.system_models as Record<string, unknown>;
  const embeddingModel = rawSystemModels.embedding as SystemEmbeddingModelConfig | undefined;
  const rerankModel = rawSystemModels.rerank as SystemRerankModelConfig | undefined;
  const remarkGroup = rawSystemModels.remark as Record<string, SystemModelCredential> | undefined;

  config.system_models.embedding = embeddingModel;
  config.system_models.rerank = rerankModel;
  config.system_models.remark = remarkGroup ?? {};

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
    max_sponsor_queued_tasks: 40,
    max_active_tasks_per_user: 5,
    max_mode_chars: 200,
    max_fingerprint_chars: 128,
    guest_result_ttl_minutes: 15,
  };
  config.analysis.max_article_chars ??= 400_000;
  config.analysis.max_output_chars ??= 1024 * 1024;
  config.analysis.max_concurrent_tasks ??= 2;
  config.analysis.max_queued_tasks ??= 20;
  config.analysis.max_sponsor_queued_tasks ??= Math.max(config.analysis.max_queued_tasks * 2, config.analysis.max_queued_tasks);
  config.analysis.max_active_tasks_per_user ??= 5;
  config.analysis.max_mode_chars ??= 200;
  config.analysis.max_fingerprint_chars ??= 128;
  config.analysis.guest_result_ttl_minutes ??= 15;

  config.admin ??= { users: [] };
  config.admin.users = Array.from(new Set((config.admin.users ?? [])
    .map(uid => Number(uid))
    .filter(uid => Number.isInteger(uid) && uid > 0)));

  config.registration ??= { invite_code_required: false };
  config.registration.invite_code_required ??= false;
  config.app ??= { app_name: "Ink Battles", base_url: "http://localhost:3001", notice: { enabled: false, content: "", link: "" } };
  config.app.app_name ??= "Ink Battles";
  config.app.notice ??= { enabled: false, content: "", link: "" };
  config.app.notice.enabled ??= false;
  config.app.notice.content ??= "";
  config.app.notice.link ??= "";
  config.friends ??= [];
}

/**
 * 校验运行时配置的合法性
 * 包括 JWT 密钥强度、应用基础 URL 格式、爱发电回调 URI 等检查
 * @param config - 运行时配置对象
 */
function validateRuntimeConfig(config: RuntimeConfig) {
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
}

/**
 * 加载运行时配置，后端是唯一读取敏感配置的服务。
 */
export function getConfig(): RuntimeConfig {
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
}

/**
 * 获取对客户端公开的配置信息
 * 过滤掉敏感数据（如 API 密钥），仅返回前端所需的应用配置、友情链接、注册策略及启用的评分模型列表
 * @returns 公开配置对象
 */
export function getPublicConfig() {
  const config = getConfig();
  return {
    app: {
      app_name: config.app.app_name,
      notice: config.app.notice,
    },
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
}

/**
 * 根据 ID 查询已启用的评分模型配置
 * @param id - 模型 ID（优先使用 model.id，否则使用 model.model）
 * @returns 匹配的评分模型配置，未找到返回 null
 */
export function getGradingModelById(id: string) {
  const config = getConfig();
  return config.grading_models.find(model => (model.id ?? model.model) === id && model.enabled) ?? null;
}

/**
 * 获取服务器相关配置
 * @returns 服务器配置对象（请求体大小限制、允许的来源等）
 */
export const getServerConfig = () => getConfig().server;

/**
 * 获取分析模块相关配置
 * @returns 分析配置对象（字符数限制、并发任务数等）
 */
export const getAnalysisConfig = () => getConfig().analysis;

/**
 * 判断指定 UID 是否为配置层管理员。
 *
 * 当前 source of truth 是 config.toml，后续切换数据库角色时只需要替换这一层。
 */
export const isConfiguredAdminUid = (uid: number) => getConfig().admin?.users?.includes(uid) === true;

/**
 * 获取应用的 Origin（协议 + 域名 + 端口）
 * @returns 应用的 Origin 字符串
 */
export const getAppOrigin = () => new URL(getConfig().app.base_url).origin;

/**
 * 读取旧式 system_models.<key> 凭证，自动跳过 embedding/rerank/remark 分组配置。
 */
export function getSystemModelCredential(key: string) {
  const value = (getConfig().system_models as Record<string, unknown>)[key];
  return isSystemModelCredential(value) ? value : null;
}

/**
 * 列出可直接用于状态统计的系统模型凭证。
 */
export function listSystemModelCredentials() {
  return Object.entries(getConfig().system_models as Record<string, unknown>)
    .filter((entry): entry is [string, SystemModelCredential] => isSystemModelCredential(entry[1]));
}

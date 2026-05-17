import { getConfig } from "../config";

interface ConfiguredStatusModel {
  id: string;
  name: string;
  model: string;
  source: "grading" | "system";
}

type ExternalStatusLog = Record<string, unknown> & {
  request_id?: string;
  created_at?: number;
  quota?: number;
  use_time?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

interface ExternalStatusListResponse {
  data?: {
    items?: Record<string, unknown>[];
    total?: number;
  };
}

interface ExternalStatusStatsResponse {
  data?: Record<string, unknown>[];
}

/**
 * 隐藏日志中的敏感字段
 * @param item - 原始日志对象
 * @returns 移除敏感字段后的日志副本
 */
function hideSensitiveLogFields(item: Record<string, unknown>) {
  const copy = { ...item };
  ["username", "user_id", "other", "ip", "group", "content", "channel", "channel_name", "token_name"].forEach(key => delete copy[key]);
  return copy;
}

/**
 * 将未知类型的值转换为数字
 * @param value - 待转换的值
 * @returns 转换后的数字，如果值为空则返回0
 */
const toNumber = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);

const normalizeModelName = (modelName: string) =>
  modelName
    .trim()
    .toLowerCase()
    .replace(/^.*\//, "");

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
}

/**
 * 读取状态页可公开展示的模型清单。
 *
 * 只返回模型标识、展示名和真实模型名，不泄露 API key、base URL 等敏感配置。
 */
function getConfiguredStatusModels(): ConfiguredStatusModel[] {
  const config = getConfig();
  const models = new Map<string, ConfiguredStatusModel>();
  const disabledModelKeys = new Set(
    config.grading_models
      .filter(model => !model.enabled)
      .map(model => normalizeModelName(model.model ?? ""))
      .filter(Boolean),
  );

  config.grading_models.forEach((model) => {
    if (!model.enabled)
      return;

    const modelName = model.model.trim();
    if (!modelName)
      return;

    models.set(normalizeModelName(modelName), {
      id: model.id ?? modelName,
      name: model.name || modelName,
      model: modelName,
      source: "grading",
    });
  });

  Object.entries(config.system_models).forEach(([key, model]) => {
    const modelName = (model.model ?? key).trim();
    if (!modelName)
      return;

    const modelKey = normalizeModelName(modelName);
    // 状态日志只提供 model_name，无法区分评分模型和系统模型来源；禁用模型名需要全局排除，避免同名日志被误统计。
    if (disabledModelKeys.has(modelKey))
      return;

    if (models.has(modelKey))
      return;

    models.set(modelKey, {
      id: key,
      name: key.replaceAll("_", " "),
      model: modelName,
      source: "system",
    });
  });

  return Array.from(models.values());
}

/**
 * 从多条日志中选择最具代表性的一条
 * 优先选择成功的日志（quota > 0），若无成功日志则选择最新的一条
 * @param logs - 日志数组
 * @returns 最具代表性的日志记录
 */
function pickRepresentativeLog(logs: ExternalStatusLog[]) {
  const successfulLog = logs
    .filter(log => toNumber(log.quota) > 0)
    .sort((left, right) => toNumber(right.created_at) - toNumber(left.created_at))[0];

  if (successfulLog)
    return successfulLog;

  return [...logs].sort((left, right) => toNumber(right.created_at) - toNumber(left.created_at))[0];
}

/**
 * 按 Request ID 合并同一次用户请求的多条渠道尝试日志。
 *
 * 规则：
 * 1. 有 Request ID 时，以 Request ID 作为逻辑请求主键。
 * 2. 优先保留最终成功的那条日志作为展示主体；若都失败，则保留最后一次尝试。
 * 3. 响应时间累计所有尝试耗时，状态按“任一成功即成功”判断。
 */
function mergeLogsByRequestId(logs: ExternalStatusLog[]) {
  const groupedLogs = new Map<string, ExternalStatusLog[]>();
  const passthroughLogs: ExternalStatusLog[] = [];

  logs.forEach((log) => {
    const requestId = typeof log.request_id === "string" ? log.request_id.trim() : "";
    if (!requestId) {
      passthroughLogs.push(log);
      return;
    }

    const existingGroup = groupedLogs.get(requestId) ?? [];
    existingGroup.push(log);
    groupedLogs.set(requestId, existingGroup);
  });

  const mergedLogs = Array.from(groupedLogs.entries()).map(([requestId, requestLogs]) => {
    const representativeLog = pickRepresentativeLog(requestLogs);
    const hasSuccess = requestLogs.some(log => toNumber(log.quota) > 0);

    return {
      ...representativeLog,
      request_id: requestId,
      quota: hasSuccess ? Math.max(...requestLogs.map(log => toNumber(log.quota))) : 0,
      use_time: requestLogs.reduce((sum, log) => sum + toNumber(log.use_time), 0),
      attempt_count: requestLogs.length,
      prompt_tokens: toNumber(representativeLog.prompt_tokens),
      completion_tokens: toNumber(representativeLog.completion_tokens),
      created_at: Math.max(...requestLogs.map(log => toNumber(log.created_at))),
    };
  });

  return [...mergedLogs, ...passthroughLogs]
    .sort((left, right) => toNumber(right.created_at) - toNumber(left.created_at));
}

/**
 * 获取外部API状态和日志信息
 * @param page - 页码
 * @param pageSize - 每页数量
 * @returns 包含日志列表、统计信息和分页信息的对象
 */
export async function getExternalStatus(page: number, pageSize: number) {
  const { api } = getConfig();
  const end = Math.floor(Date.now() / 1000);
  const start = end - 14 * 24 * 60 * 60;
  const headers = { "Authorization": `Bearer ${api.key || ""}`, "new-api-user": `${api.user || ""}` };

  const [logResponse, statsResponse] = await Promise.all([
    fetch(`${api.base_url}/api/log/self?p=${page}&page_size=${pageSize}&type=0&start_timestamp=${start}&end_timestamp=${end}&group=`, { headers }),
    fetch(`${api.base_url}/api/data/self?start_timestamp=${start}&end_timestamp=${end}&default_time=hour`, { headers }),
  ]);

  const configuredModels = getConfiguredStatusModels();
  const enabledModelKeys = new Set(configuredModels.map(model => normalizeModelName(model.model)));
  const data = await readJson<ExternalStatusListResponse>(logResponse);
  const statsData = await readJson<ExternalStatusStatsResponse>(statsResponse);
  const logData = data?.data ?? { items: [], total: 0 };
  const statsItems = statsData?.data ?? [];
  const items = statsItems
    .map(hideSensitiveLogFields)
    .filter((item) => {
      const modelName = typeof item.model_name === "string" ? item.model_name : "";
      return !modelName || enabledModelKeys.has(normalizeModelName(modelName));
    });
  const rawLogs = (logData.items ?? [])
    .map(hideSensitiveLogFields)
    .filter((log): log is ExternalStatusLog => {
      const modelName = typeof log.model_name === "string" ? log.model_name : "";
      // 上游状态流可能包含已禁用模型；状态页只展示并统计当前启用配置里的模型。
      return enabledModelKeys.has(normalizeModelName(modelName));
    });
  const mergedLogs = mergeLogsByRequestId(rawLogs);

  return {
    success: true,
    ...logData,
    items: mergedLogs,
    stats: {
      totalRequests: items.reduce((sum, item) => sum + toNumber(item.count), 0),
      averageTime: mergedLogs.length ? mergedLogs.reduce((sum, log) => sum + toNumber(log.use_time), 0) / mergedLogs.length : 0,
      successRate: mergedLogs.length ? (mergedLogs.filter(log => toNumber(log.quota) > 0).length / mergedLogs.length) * 100 : 0,
      totalTokens: items.reduce((sum, item) => sum + toNumber(item.token_used), 0),
    },
    configured_models: configuredModels,
    has_more: toNumber(logData.total) > page * pageSize,
  };
}

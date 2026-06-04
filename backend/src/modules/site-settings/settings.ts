import type {
  AiGenerationSetting,
  AnalysisRuntimeSetting,
  AnalysisScoringPolicySetting,
  FriendLink,
  GradingModelAdminConfig,
  SiteSettingKey,
  SiteSettingMeta,
  SiteSettingValueMap,
} from "@ink-battles/shared/types/common";
import type { Document } from "mongodb";
import { getConfig } from "../../config";

export interface SiteSettingDocument extends Document {
  key: SiteSettingKey;
  category: SiteSettingMeta["category"];
  value: SiteSettingValueMap[SiteSettingKey];
  updatedAt: Date;
  updatedByUid: number;
  updatedByLabel: string;
}

export interface SiteSettingChangeDocument extends Document {
  key: SiteSettingKey;
  adminUid: number;
  adminLabel: string;
  before: SiteSettingValueMap[SiteSettingKey] | null;
  after: SiteSettingValueMap[SiteSettingKey];
  ipHash?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

export type EffectiveGradingModelConfig = ReturnType<typeof getConfig>["grading_models"][number];

export const SETTING_DEFINITIONS: Array<Pick<SiteSettingMeta, "key" | "label" | "description" | "category">> = [
  {
    key: "site.notice",
    label: "首页公告",
    description: "首页顶部公告栏内容，适合临时通知、活动提醒和维护公告。",
    category: "content",
  },
  {
    key: "site.friends",
    label: "友情链接",
    description: "友情链接列表，属于内容型配置，适合由后台可视化维护。",
    category: "content",
  },
  {
    key: "registration.policy",
    label: "注册策略",
    description: "是否要求邀请码等注册开关，修改后立即影响注册流程。",
    category: "registration",
  },
  {
    key: "content.uploadLimits",
    label: "上传与输入限制",
    description: "前端输入和上传提示使用的字数限制，后端硬限制仍由分析基础配置兜底。",
    category: "limits",
  },
  {
    key: "analysis.runtime",
    label: "文章分析运行参数",
    description: "分析提交、队列、输出、游客结果保留和流式处理限制。",
    category: "limits",
  },
  {
    key: "analysis.scoringPolicy",
    label: "评分计算策略",
    description: "最终分数计算中的补偿阈值和权重策略。",
    category: "limits",
  },
  {
    key: "ai.generation",
    label: "AI 生成参数",
    description: "模型生成温度、seed 和 JSON mode 等不含凭证的调用策略。",
    category: "limits",
  },
  {
    key: "ai.gradingModels",
    label: "评分模型运营信息",
    description: "模型展示名、启用状态、会员标记和公开说明；密钥与地址仍来自启动配置。",
    category: "content",
  },
  {
    key: "content.honoraryWriters",
    label: "荣誉作家管理",
    description: "授予指定用户亮点句子审核、通过和驳回权限，不包含站点配置等系统级管理能力。",
    category: "content",
  },
];

const numericValue = (input: unknown, fallback: number) => {
  const nextValue = Number(input);
  return Number.isInteger(nextValue) && nextValue > 0 ? nextValue : fallback;
};

/**
 * 返回 config.toml 中可作为数据库站点配置初始值的安全默认值。
 */
export function getDefaultSettingValue<Key extends SiteSettingKey>(key: Key): SiteSettingValueMap[Key] {
  const config = getConfig();
  const defaults: SiteSettingValueMap = {
    "site.notice": config.app.notice,
    "site.friends": config.friends ?? [],
    "registration.policy": config.registration,
    "content.uploadLimits": {
      guestPerRequestChars: 60000,
      loggedPerRequestChars: 60000,
      guestDailyChars: 100000,
    },
    "analysis.runtime": {
      ...config.analysis,
      task_timeout_ms: 7 * 60 * 1000,
      stream_max_chunks: 20000,
      validation_max_text_chars: 200000,
      excellent_sentences_max_count: 2,
    },
    "analysis.scoringPolicy": {
      enable_low_score_compensation: true,
      compensation_score_floor: 3,
      compensation_min_count_above_3_5: 6,
      compensation_min_count_above_4_0: 3,
    },
    "ai.generation": {
      default_temperature: 0.3,
      gpt5_nano_temperature: 1,
      enable_seed: true,
      enable_json_mode_when_supported: true,
    },
    "ai.gradingModels": config.grading_models.map(model => ({
      id: model.id ?? model.model,
      name: model.name,
      model: model.model,
      description: model.description,
      enabled: model.enabled,
      premium: model.premium === true,
      features: model.features ?? [],
      advantages: model.advantages,
      usageScenario: model.usageScenario,
      warning: model.warning,
      supports_json_mode: model.supports_json_mode,
    })),
    "content.honoraryWriters": {
      uids: [],
    },
  };
  return defaults[key] as SiteSettingValueMap[Key];
}

/**
 * 校验并规整站点配置值，避免任意 JSON 污染公共配置结构。
 */
export function normalizeSettingValue<Key extends SiteSettingKey>(key: Key, value: unknown): SiteSettingValueMap[Key] {
  if (key === "site.notice") {
    const record = value as Partial<SiteSettingValueMap["site.notice"]>;
    return {
      enabled: record.enabled === true,
      content: String(record.content ?? "").slice(0, 500),
      link: String(record.link ?? "").slice(0, 500),
    } as SiteSettingValueMap[Key];
  }

  if (key === "site.friends") {
    const list = Array.isArray(value) ? value : [];
    return list.slice(0, 100).map((item) => {
      const record = item as Partial<FriendLink>;
      return {
        title: String(record.title ?? "").slice(0, 80),
        description: String(record.description ?? "").slice(0, 200),
        url: String(record.url ?? "").slice(0, 500),
      };
    }).filter(item => item.title && item.url) as SiteSettingValueMap[Key];
  }

  if (key === "registration.policy") {
    const record = value as Partial<SiteSettingValueMap["registration.policy"]>;
    return {
      invite_code_required: record.invite_code_required === true,
    } as SiteSettingValueMap[Key];
  }

  if (key === "content.uploadLimits") {
    const record = value as Partial<SiteSettingValueMap["content.uploadLimits"]>;
    return {
      guestPerRequestChars: numericValue(record.guestPerRequestChars, 60000),
      loggedPerRequestChars: numericValue(record.loggedPerRequestChars, 60000),
      guestDailyChars: numericValue(record.guestDailyChars, 100000),
    } as SiteSettingValueMap[Key];
  }

  if (key === "analysis.runtime") {
    const fallback = getDefaultSettingValue("analysis.runtime");
    const record = value as Partial<AnalysisRuntimeSetting>;
    return {
      max_article_chars: numericValue(record.max_article_chars, fallback.max_article_chars),
      max_output_chars: numericValue(record.max_output_chars, fallback.max_output_chars),
      max_concurrent_tasks: numericValue(record.max_concurrent_tasks, fallback.max_concurrent_tasks),
      max_queued_tasks: numericValue(record.max_queued_tasks, fallback.max_queued_tasks),
      max_sponsor_queued_tasks: numericValue(record.max_sponsor_queued_tasks, fallback.max_sponsor_queued_tasks),
      max_active_tasks_per_user: numericValue(record.max_active_tasks_per_user, fallback.max_active_tasks_per_user),
      max_mode_chars: numericValue(record.max_mode_chars, fallback.max_mode_chars),
      max_fingerprint_chars: numericValue(record.max_fingerprint_chars, fallback.max_fingerprint_chars),
      guest_result_ttl_minutes: numericValue(record.guest_result_ttl_minutes, fallback.guest_result_ttl_minutes),
      task_timeout_ms: numericValue(record.task_timeout_ms, fallback.task_timeout_ms),
      stream_max_chunks: numericValue(record.stream_max_chunks, fallback.stream_max_chunks),
      validation_max_text_chars: numericValue(record.validation_max_text_chars, fallback.validation_max_text_chars),
      excellent_sentences_max_count: numericValue(record.excellent_sentences_max_count, fallback.excellent_sentences_max_count),
    } as SiteSettingValueMap[Key];
  }

  if (key === "analysis.scoringPolicy") {
    const fallback = getDefaultSettingValue("analysis.scoringPolicy");
    const record = value as Partial<AnalysisScoringPolicySetting>;
    return {
      enable_low_score_compensation: record.enable_low_score_compensation !== false,
      compensation_score_floor: Number(record.compensation_score_floor) || fallback.compensation_score_floor,
      compensation_min_count_above_3_5: numericValue(record.compensation_min_count_above_3_5, fallback.compensation_min_count_above_3_5),
      compensation_min_count_above_4_0: numericValue(record.compensation_min_count_above_4_0, fallback.compensation_min_count_above_4_0),
    } as SiteSettingValueMap[Key];
  }

  if (key === "ai.generation") {
    const fallback = getDefaultSettingValue("ai.generation");
    const record = value as Partial<AiGenerationSetting>;
    return {
      default_temperature: Number.isFinite(Number(record.default_temperature)) ? Number(record.default_temperature) : fallback.default_temperature,
      gpt5_nano_temperature: Number.isFinite(Number(record.gpt5_nano_temperature)) ? Number(record.gpt5_nano_temperature) : fallback.gpt5_nano_temperature,
      enable_seed: record.enable_seed !== false,
      enable_json_mode_when_supported: record.enable_json_mode_when_supported !== false,
    } as SiteSettingValueMap[Key];
  }

  if (key === "content.honoraryWriters") {
    const record = value as Partial<SiteSettingValueMap["content.honoraryWriters"]>;
    const uids = Array.isArray(record.uids) ? record.uids : [];
    return {
      uids: Array.from(new Set(uids.map(uid => Number(uid)).filter(uid => Number.isInteger(uid) && uid > 0))).slice(0, 200),
    } as SiteSettingValueMap[Key];
  }

  const list = Array.isArray(value) ? value : [];
  return list.map((item) => {
    const record = item as Partial<GradingModelAdminConfig>;
    return {
      id: String(record.id ?? record.model ?? "").slice(0, 128),
      name: String(record.name ?? record.model ?? "").slice(0, 80),
      model: String(record.model ?? record.id ?? "").slice(0, 128),
      description: String(record.description ?? "").slice(0, 500),
      enabled: record.enabled !== false,
      premium: record.premium === true,
      features: Array.isArray(record.features) ? record.features.map(feature => String(feature).slice(0, 80)).slice(0, 20) : [],
      advantages: Array.isArray(record.advantages) ? record.advantages.map(advantage => String(advantage).slice(0, 200)).slice(0, 20) : undefined,
      usageScenario: record.usageScenario ? String(record.usageScenario).slice(0, 500) : undefined,
      warning: record.warning ? String(record.warning).slice(0, 500) : undefined,
      supports_json_mode: record.supports_json_mode,
    };
  }).filter(item => item.id && item.model) as SiteSettingValueMap[Key];
}

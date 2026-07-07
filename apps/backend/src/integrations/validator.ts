import { randomBytes } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto-js";
import OpenAI from "openai";
import { getSystemModelCredential } from "../config";
import { COLLECTIONS, ensureTtlIndex, findOne, insertOne } from "../db/mongo";
import { getCachedSiteSettingValue } from "../modules/site-settings";
import { parseModelOutput } from "../utils/json-parser";

const NORMALIZE_TEXT_REGEX = /[\s\p{P}\p{S}]/gu;
const JSON_MATCH_REGEX = /data:\s*(\{[\s\S]*\})/;
const DATA_PREFIX_REGEX = /^data:\s*/;

type SearchModel = "none" | "gemini" | "gemini-lite" | "ds-search";

interface ValidationResult {
  success: boolean;
  error?: string;
  session?: string;
}

interface ParsedValidation {
  success: boolean;
  message?: string;
  searchSummary?: string;
}

interface ValidatorModelConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

/**
 * 验证文章内容的有效性
 * 通过AI模型判断文章是否为有效内容，支持可选的搜索增强
 * @param input - 验证输入参数
 * @param input.articleText - 文章文本内容
 * @param input.mode - 分析模式
 * @param input.modelId - 模型ID
 * @param input.modelName - 模型名称
 * @param input.fingerprint - 用户指纹
 * @param input.searchModel - 搜索模型类型，默认为"none"
 * @param input.signal - 中止信号
 * @returns 验证结果，包含是否成功、错误信息和会话ID
 */
export async function verifyArticleValue(input: {
  articleText: string;
  mode: string;
  modelId: string;
  modelName: string;
  fingerprint: string;
  searchModel?: SearchModel;
  signal?: AbortSignal;
}): Promise<ValidationResult> {
  const searchModel = input.searchModel ?? "none";
  const modelConfig = selectValidatorModel(searchModel);
  if (!modelConfig)
    return { success: true };

  const normalizedText = input.articleText.replace(NORMALIZE_TEXT_REGEX, "");
  const sha1 = crypto.SHA1(normalizedText).toString();
  const cached = await findCachedAnalysis(sha1, input.mode, input.modelId, input.modelName);
  if (cached)
    return { success: true };

  const validatorModelName = modelConfig.modelName;
  const systemInstruction = buildSystemInstruction(searchModel !== "none");

  try {
    if (searchModel === "gemini" || searchModel === "gemini-lite") {
      return await validateWithGemini({
        articleText: input.articleText,
        fingerprint: input.fingerprint,
        modelConfig,
        modelName: validatorModelName,
        sha1,
        signal: input.signal,
        systemInstruction,
      });
    }

    return await validateWithOpenAI({
      articleText: input.articleText,
      fingerprint: input.fingerprint,
      modelConfig,
      modelName: validatorModelName,
      sha1,
      signal: input.signal,
      systemInstruction,
    });
  } catch (error) {
    console.error("Verify Error:", error);
    return { success: false, error: extractValidationError(error) };
  }
}

/**
 * 查找缓存的分析结果
 * @param sha1 - 文章内容的SHA1哈希值
 * @param mode - 分析模式
 * @param modelId - 模型ID
 * @param modelName - 模型名称
 * @returns 缓存的分析记录，如果不存在则返回null
 */
async function findCachedAnalysis(sha1: string, mode: string, modelId: string, modelName: string) {
  const now = new Date().toISOString();
  return await findOne(COLLECTIONS.analysisRequests, {
    "metadata.sha1": sha1,
    "article.input.mode": mode,
    "metadata.modelName": modelName,
    "privacy.hiddenAt": { $exists: false },
    "$or": [
      { "privacy.expiresAt": { $exists: false } },
      { "privacy.expiresAt": { $gt: now } },
    ],
  }) ?? await findOne(COLLECTIONS.analysisRequests, {
    "metadata.sha1": sha1,
    "article.input.mode": mode,
    "metadata.modelId": modelId,
    "privacy.hiddenAt": { $exists: false },
    "$or": [
      { "privacy.expiresAt": { $exists: false } },
      { "privacy.expiresAt": { $gt: now } },
    ],
  });
}

/**
 * 根据搜索模型类型选择对应的验证器模型配置
 * @param searchModel - 搜索模型类型
 * @returns 模型配置，包含API密钥、基础URL和模型名称
 */
function selectValidatorModel(searchModel: SearchModel) {
  const key = getValidatorModelKey(searchModel);
  const model = getSystemModelCredential(key);
  if (!model)
    throw new Error(`缺少系统校验模型配置: ${key}`);
  if (model.enabled === false)
    return null;
  const validatorSetting = getCachedSiteSettingValue("ai.validator");
  if ("enabled" in validatorSetting && validatorSetting.enabled === false)
    return null;
  const dynamicModels = Array.isArray(validatorSetting.models) ? validatorSetting.models : [];
  const dynamicModel = dynamicModels.find(item => item.id === key || item.model === model.model);
  if (dynamicModel?.enabled === false)
    return null;
  return {
    apiKey: model.api_key,
    baseUrl: model.base_url,
    modelName: model.model ?? (searchModel === "none" ? "glm-4.7" : searchModel),
  };
}

/**
 * 根据搜索模式映射到 config.toml 中的系统校验模型段。
 * @param searchModel - 搜索模型类型
 * @returns system_models 下的校验模型 key
 */
function getValidatorModelKey(searchModel: SearchModel) {
  return {
    "ds-search": "validator_deepseek_search",
    "gemini": "validator_gemini",
    "gemini-lite": "validator_gemini_lite",
    "none": "validator_nosearch",
  }[searchModel];
}

/**
 * 使用Gemini模型进行内容验证
 * @param input - 验证输入参数
 * @param input.articleText - 文章文本
 * @param input.fingerprint - 用户指纹
 * @param input.modelConfig - 模型配置
 * @param input.modelName - 模型名称
 * @param input.sha1 - 文章SHA1哈希值
 * @param input.signal - 中止信号
 * @param input.systemInstruction - 系统指令
 * @returns 验证结果
 */
async function validateWithGemini(input: {
  articleText: string;
  fingerprint: string;
  modelConfig: ValidatorModelConfig;
  modelName: string;
  sha1: string;
  signal?: AbortSignal;
  systemInstruction: string;
}) {
  const client = new GoogleGenAI({
    apiKey: input.modelConfig.apiKey,
    httpOptions: { baseUrl: input.modelConfig.baseUrl },
  });
  const response = await client.models.generateContent({
    model: input.modelName,
    contents: [{ role: "user", parts: [{ text: input.articleText }] }],
    config: {
      abortSignal: input.signal,
      systemInstruction: input.systemInstruction,
      tools: [{ googleSearch: {} }],
    },
  });
  const rawText = response.text || "";
  const analysisConfig = getCachedSiteSettingValue("analysis.runtime");
  if (rawText.length > analysisConfig.validation_max_text_chars)
    throw new Error("AI验证服务返回内容过大");
  const parsed = parseValidation(rawText);
  const searchWebPages = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map(chunk => chunk.web)
    .filter((web): web is { uri: string; title?: string } => !!web?.uri)
    .map(web => ({ uri: web.uri, title: web.title || undefined })) ?? [];
  return createValidationSession(input.fingerprint, input.sha1, parsed, searchWebPages);
}

/**
 * 使用OpenAI兼容模型进行内容验证
 * @param input - 验证输入参数
 * @param input.articleText - 文章文本
 * @param input.fingerprint - 用户指纹
 * @param input.modelConfig - 模型配置
 * @param input.modelName - 模型名称
 * @param input.sha1 - 文章SHA1哈希值
 * @param input.signal - 中止信号
 * @param input.systemInstruction - 系统指令
 * @returns 验证结果
 */
async function validateWithOpenAI(input: {
  articleText: string;
  fingerprint: string;
  modelConfig: ValidatorModelConfig;
  modelName: string;
  sha1: string;
  signal?: AbortSignal;
  systemInstruction: string;
}) {
  const client = new OpenAI({ apiKey: input.modelConfig.apiKey, baseURL: input.modelConfig.baseUrl });
  const response = await client.chat.completions.create({
    model: input.modelName,
    messages: [
      { role: "system", content: input.systemInstruction },
      { role: "user", content: input.articleText },
    ],
    response_format: { type: "json_object" },
  }, { signal: input.signal });
  const rawText = response.choices[0]?.message?.content || "";
  const analysisConfig = getCachedSiteSettingValue("analysis.runtime");
  if (rawText.length > analysisConfig.validation_max_text_chars)
    throw new Error("AI验证服务返回内容过大");
  return createValidationSession(input.fingerprint, input.sha1, parseValidation(rawText), []);
}

/**
 * 解析AI模型返回的验证结果
 * @param rawText - AI模型返回的原始文本
 * @returns 解析后的验证结果对象
 */
function parseValidation(rawText: string): ParsedValidation {
  if (!rawText)
    throw new Error("AI验证服务无响应");
  const parseResult = parseModelOutput<ParsedValidation>(rawText);
  if (!parseResult.ok || !parseResult.data)
    throw new Error(`AI返回数据格式错误: ${parseResult.warnings.join(", ")}`);
  if (typeof parseResult.data.success !== "boolean")
    throw new Error("AI返回格式异常: 缺少 success 字段");
  return parseResult.data;
}

/**
 * 创建验证会话并保存到数据库
 * @param fingerprint - 用户指纹
 * @param sha1 - 文章SHA1哈希值
 * @param parsed - 解析后的验证结果
 * @param searchWebPages - 搜索结果网页列表
 * @returns 验证结果，包含会话ID
 */
async function createValidationSession(fingerprint: string, sha1: string, parsed: ParsedValidation, searchWebPages: Array<{ uri: string; title?: string }>): Promise<ValidationResult> {
  const analysisConfig = getCachedSiteSettingValue("analysis.runtime");
  const session = randomBytes(8).toString("hex");
  await ensureTtlIndex(COLLECTIONS.sessions, "createdAt", 30 * 60);
  const searchSummary = parsed.searchSummary?.slice(0, analysisConfig.max_output_chars);
  await insertOne(COLLECTIONS.sessions, {
    fingerprint,
    session,
    sha1,
    ...(searchSummary && { searchResults: searchSummary }),
    ...(searchWebPages.length > 0 && { searchWebPages }),
    used: false,
    createdAt: new Date(),
  });
  return {
    success: parsed.success,
    error: parsed.success ? undefined : (parsed.message || "内容未通过验证"),
    session,
  };
}

/**
 * 从错误对象中提取可读的错误信息
 * @param error - 错误对象
 * @returns 格式化后的错误信息字符串
 */
function extractValidationError(error: unknown): string {
  let message = (error as Error).message || "验证服务连接失败";
  if (message.includes("is not valid JSON") && message.includes("data:")) {
    return "API节点返回了无法解析的数据格式（建议检查模型代理配置，或代理服务器返回了未预期的错误格式）";
  }
  if (message.startsWith("data: ")) {
    const match = message.match(JSON_MATCH_REGEX);
    if (match) {
      const parsed = parseModelOutput<{ error?: string; message?: string }>(match[1]);
      if (parsed.ok && parsed.data)
        return parsed.data.error || parsed.data.message || message;
    }
    message = message.replace(DATA_PREFIX_REGEX, "").substring(0, 200);
  }
  return message;
}

/**
 * 构建系统指令提示词
 * @param enableSearch - 是否启用搜索功能
 * @returns 完整的系统指令字符串
 */
function buildSystemInstruction(enableSearch: boolean): string {
  return `你是一个严格的内容验证专家。请分析用户输入的文本内容，判断其有效性。${enableSearch ? "运用自带的搜索能力提取相关资料并总结关键信息。" : ""}

### 1. 内容有效性校验
- **核心目标**：拦截一切明显无意义或会严重浪费Tokens的内容。
- **判定为"无效"的规则（满足任一则判定为不通过）**：
  - **乱码/不可读**：主要由随机字符、无意义符号或编码噪声构成，无法形成可理解的词语或语句。
  - **极端重复/灌水**：大段重复同一字符/词/句，或无内容的大篇幅占位符。
  - **净空内容**：仅包含空白、换行或极少量无意义字符。
- **判定为"有效"的情况**：程序代码、配置文件、日志片段、命令行输出、公式、列表、片段化笔记、短语、单个句子等，只要非上述无效规则涵盖，均视为有效。

${enableSearch
  ? `### 2. 搜索执行与总结
- 经典文章、同人作品、再创作/改编必须搜索；明显原创或信息量极短的文本可不搜索。
- 提取3-8个关键词，阅读搜索结果，并在 searchSummary 中总结原始来源、作者信息、作品背景、时代事实和有助于理解文章的关键信息。

### 3. 作者来源判断与保险机制`
  : `### 2. 作者来源判断与保险机制`}
- 在未获得明确、可验证的现实证据之前，不得将用户提交文本直接判定为某一现实作家或既有作品的创作成果。
- 文本风格、语言、主题相似性不构成作者归属判断的充分条件。
- 对文本写作水准、技巧成熟度、思想深度的评价，必须与作者身份判断相互独立。

### ${enableSearch ? "4" : "3"}. 结果返回格式
最终回复必须且只能是合法 JSON 对象：
{
  "success": true,
  "message": "如果success为false，提供具体原因；否则留空或简述类型。"${enableSearch
    ? `,
  "searchSummary": "搜索结果的关键信息总结，未搜索则留空字符串。"`
    : ""}
}`;
}

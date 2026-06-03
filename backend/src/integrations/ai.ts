import OpenAI from "openai";
import { buildSystemPrompt, getModeInstructions } from "../constants/other/prompts";
import { getCachedEffectiveGradingModelById, getCachedSiteSettingValue } from "../modules/site-settings";

export interface AnalysisStreamInput {
  articleText: string;
  mode: string;
  modelId: string;
  fingerprint: string;
  searchResults?: string | null;
  signal?: AbortSignal;
  maxOutputChars?: number;
  onProgress?: (chunk: string, chunkCount: number) => Promise<void> | void;
}

/**
 * 运行AI分析模型，对文章进行流式分析
 * @param input - 分析输入参数
 * @param input.articleText - 文章文本内容
 * @param input.mode - 分析模式
 * @param input.modelId - 模型ID
 * @param input.fingerprint - 用户指纹
 * @param input.searchResults - 可选的搜索结果摘要
 * @param input.signal - 中止信号
 * @param input.maxOutputChars - 最大输出字符数限制
 * @param input.onProgress - 进度回调函数
 * @returns 完整的分析结果文本
 */
export async function runAnalysisModel(input: AnalysisStreamInput) {
  const model = getCachedEffectiveGradingModelById(input.modelId);
  if (!model)
    throw new Error("无效的评分模型");

  const generationConfig = getCachedSiteSettingValue("ai.generation");
  const client = new OpenAI({ apiKey: model.api_key, baseURL: model.base_url });
  const modeInstruction = await getModeInstructions(input.mode);
  const systemPrompt = await buildSystemPrompt(modeInstruction);
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  if (input.searchResults) {
    messages.push({ role: "user", content: `以下是通过搜索获得的背景资料总结（供参考）：\n\n${input.searchResults}` });
  }
  messages.push({ role: "user", content: input.articleText });

  const stream = await client.chat.completions.create({
    model: model.model,
    messages,
    temperature: model.model.includes("gpt-5-nano") ? generationConfig.gpt5_nano_temperature : generationConfig.default_temperature,
    ...(generationConfig.enable_json_mode_when_supported && model.supports_json_mode !== false ? { response_format: { type: "json_object" as const } } : {}),
    seed: generationConfig.enable_seed && input.fingerprint ? Number.parseInt(input.fingerprint) : undefined,
    stream: true,
  }, { signal: input.signal });

  const contentChunks: string[] = [];
  let contentLength = 0;
  let chunkCount = 0;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (!delta)
      continue;
    if (input.maxOutputChars && contentLength + delta.length > input.maxOutputChars)
      throw new Error(`流式内容大小超过限制 (${Math.round(input.maxOutputChars / 1024)}KB)`);
    contentChunks.push(delta);
    contentLength += delta.length;
    chunkCount++;
    await input.onProgress?.(delta, chunkCount);
  }
  return contentChunks.join("");
}

/**
 * 计算分数的百分位数
 * @param score - 原始分数
 * @returns 包含百分位数和样本大小的对象
 */
export function calculateScorePercentile(score: number) {
  return {
    percentile: Math.max(0, Math.min(100, Math.round(score))),
    sampleSize: 0,
  };
}

/**
 * 获取所有已启用的公开评分模型列表
 * @returns 已启用的评分模型数组
 */
export const publicModels = () => getCachedSiteSettingValue("ai.gradingModels").filter(model => model.enabled);

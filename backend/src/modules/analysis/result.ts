import type { AnalysisResult, AnalysisSearchContext } from "./types";
import { ObjectId } from "mongodb";
import { COLLECTIONS, findOne, insertOne, updateOne } from "../../db/mongo";
import { parseModelOutput } from "../../utils/json-parser";
import { createProgress } from "../analysis-progress";

/**
 * 加载搜索上下文数据
 * @param session - 会话 ID
 * @returns 搜索上下文对象，包含搜索结果和网页数据
 */
export async function loadSearchContext(session?: string): Promise<AnalysisSearchContext> {
  if (!session)
    return { searchResults: "", searchWebPages: undefined };
  const record = await findOne(COLLECTIONS.sessions, { session });
  return {
    searchResults: typeof record?.searchResults === "string" ? record.searchResults : "",
    searchWebPages: record?.searchWebPages,
  };
}

/**
 * 保存分析结果到数据库
 * 解析模型输出、验证格式、计算总分并创建结果记录
 * @param input - 保存结果的输入参数
 * @param input.taskId - 任务 ID
 * @param input.uid - 用户 ID
 * @param input.accumulatedContent - 模型累积输出的完整内容
 * @param input.search - 搜索上下文
 * @param input.ensureTaskActive - 确保任务仍处于活动状态的函数
 */
export async function saveAnalysisResult(input: {
  taskId: ObjectId;
  uid: number | null;
  accumulatedContent: string;
  search: AnalysisSearchContext;
  ensureTaskActive: (taskId: ObjectId) => Promise<void>;
}) {
  if (!input.accumulatedContent.trim())
    throw new Error("AI模型返回空内容");
  const task = await findOne(COLLECTIONS.analysisTasks, { _id: input.taskId });
  if (!task)
    throw new Error("任务记录不存在");
  await input.ensureTaskActive(input.taskId);

  const parseResult = parseModelOutput<AnalysisResult>(input.accumulatedContent);
  if (!parseResult.ok || !parseResult.data)
    throw new Error(`无效的 JSON 格式: ${parseResult.warnings.join(", ")}`);
  if (parseResult.removed.length > 0)
    console.warn(`[${input.taskId}] 已移除 ${parseResult.removed.length} 个无效条目`, parseResult.removed);
  if (!isValidAnalysisResult(parseResult.data))
    throw new Error("返回结果格式无效");

  parseResult.data.excellentSentences = normalizeExcellentSentences(parseResult.data.excellentSentences);
  const overallScore = calculateFinalScore(parseResult.data);
  const resultId = new ObjectId();
  await insertOne(COLLECTIONS.analysisRequests, {
    _id: resultId,
    uid: input.uid,
    status: "completed",
    article: {
      input: {
        articleText: task.input.articleText,
        mode: task.input.mode,
        search: input.search,
      },
      output: {
        result: JSON.stringify(parseResult.data),
        overallScore,
        tags: parseResult.data.tags || [],
      },
    },
    metadata: task.metadata,
    timestamp: new Date().toISOString(),
    privacy: {},
  });
  await updateOne(COLLECTIONS.analysisTasks, { _id: input.taskId }, {
    status: "completed",
    resultId: resultId.toString(),
    input: { ...task.input, search: input.search },
    progress: createProgress("completed", "分析完成，可以查看结果", 100),
    updatedAt: new Date().toISOString(),
  });
  await updateOne(COLLECTIONS.analysisTasks, { _id: input.taskId }, {
    $set: {
      "billing.completedAt": new Date().toISOString(),
    },
  });
}

/**
 * 计算分析结果的最终加权分数
 * 基础维度分数之和乘以经典性和新锐性权重
 * 当基础维度高分项数量达到阈值时，对低分项进行补偿
 * @param result - 分析结果对象
 * @returns 计算后的最终分数，保留两位小数
 */
function calculateFinalScore(result: AnalysisResult): number {
  const dimensions = Array.isArray(result.dimensions) ? result.dimensions : [];
  const baseDimensions = dimensions.filter(item => !item.name.includes("经典") && !item.name.includes("新锐"));
  const countAbove35 = baseDimensions.filter(item => item.score > 3.5).length;
  const countAbove40 = baseDimensions.filter(item => item.score > 4).length;
  if (countAbove35 >= 6 || countAbove40 >= 3) {
    for (const dimension of baseDimensions) {
      if (dimension.score < 3)
        dimension.score = 3;
    }
  }
  const baseScore = baseDimensions.reduce((sum, item) => sum + (item.score || 0), 0);
  const classicityWeight = dimensions.find(item => item.name.includes("经典"))?.score || 1;
  const noveltyWeight = dimensions.find(item => item.name.includes("新锐"))?.score || 1;
  const finalScore = baseScore * classicityWeight * noveltyWeight;
  return Number.isFinite(finalScore) ? Math.round(finalScore * 100) / 100 : 0;
}

/**
 * 验证分析结果对象的格式是否符合预期
 * @param result - 待验证的分析结果对象
 * @returns 是否为有效的分析结果
 */
function isValidAnalysisResult(result: AnalysisResult) {
  return !!result
    && ["title", "ratingTag", "finalTag", "overallAssessment", "summary"].every(field => typeof result[field as keyof AnalysisResult] === "string")
    && Array.isArray(result.tags)
    && result.tags.length > 0
    && Array.isArray(result.dimensions)
    && result.dimensions.every(item => typeof item.name === "string" && typeof item.score === "number" && item.score >= 0 && item.score <= 5 && typeof item.description === "string")
    && Array.isArray(result.strengths)
    && Array.isArray(result.improvements)
    && (result.authorMatches === undefined || result.authorMatches.every(item =>
      typeof item.name === "string"
      && typeof item.styleLabel === "string"
      && typeof item.description === "string"
      && typeof item.confidence === "number"
      && Array.isArray(item.reasons)))
    && (result.excellentSentences === undefined || result.excellentSentences.every(item =>
      typeof item.content === "string"
      && item.content.trim().length > 0
      && typeof item.reason === "string"
      && item.reason.trim().length > 0));
}

/**
 * 限制优秀句子候选数量，避免模型为了凑数量输出低质量或重复摘录。
 * @param sentences - 模型输出的优秀句子候选
 * @returns 最多两个去重后的候选句
 */
function normalizeExcellentSentences(sentences: AnalysisResult["excellentSentences"]) {
  if (!Array.isArray(sentences))
    return [];

  const seen = new Set<string>();
  const normalizedSentences: NonNullable<AnalysisResult["excellentSentences"]> = [];
  for (const sentence of sentences) {
    const normalizedContent = sentence.content.trim().replace(/\s+/g, "");
    if (!normalizedContent || seen.has(normalizedContent))
      continue;
    seen.add(normalizedContent);
    normalizedSentences.push({
      content: sentence.content.trim(),
      reason: sentence.reason.trim(),
    });
    if (normalizedSentences.length >= 2)
      break;
  }

  return normalizedSentences;
}

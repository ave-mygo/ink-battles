import type { SearchModel } from "./types";
import { ObjectId } from "mongodb";
import { COLLECTIONS, findOne, insertOne } from "../../db/mongo";
import { createProgress } from "../analysis-progress";

const MODEL_PREFIX_REGEX = /^(按次|公益)-/;

/**
 * 清理模型名称中的前缀（如 "按次-"、"公益-"）
 * @param modelName - 原始模型名称
 * @returns 清理后的模型名称
 */
export const cleanModelName = (modelName: string) => modelName.replace(MODEL_PREFIX_REGEX, "");

/**
 * 创建一个命中缓存的分析任务记录
 * @param input - 缓存任务的输入参数
 * @param input.uid - 用户 ID
 * @param input.articleText - 文章文本
 * @param input.mode - 分析模式
 * @param input.modelId - 模型 ID
 * @param input.fingerprint - 任务指纹
 * @param input.sha1 - 文章内容的 SHA1 哈希
 * @param input.searchModel - 搜索模型类型
 * @param input.resultId - 已有的分析结果 ID
 * @returns 创建的任务 ID 字符串
 */
export async function createCachedTask(input: {
  uid: number | null;
  articleText: string;
  mode: string;
  modelId: string;
  fingerprint: string;
  sha1: string;
  searchModel: SearchModel;
  resultId: string;
}) {
  const taskId = new ObjectId();
  await insertOne(COLLECTIONS.analysisTasks, {
    _id: taskId,
    uid: input.uid,
    status: "completed",
    input: { articleText: input.articleText, mode: input.mode, modelId: input.modelId },
    metadata: {
      sha1: input.sha1,
      fingerprint: input.fingerprint,
      searchModel: input.searchModel,
      session: "cached",
    },
    progress: createProgress("completed", "命中缓存，任务已完成", 100),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resultId: input.resultId,
  });
  return taskId.toString();
}

/**
 * 查询是否存在可复用的分析缓存结果
 * 根据 SHA1、模式、模型和搜索类型匹配，排除过期和已隐藏的记录
 * @param sha1 - 文章内容的 SHA1 哈希
 * @param mode - 分析模式
 * @param modelName - 模型名称
 * @param searchModel - 搜索模型类型
 * @returns 匹配的分析请求记录，未找到时返回 null
 */
export async function findCachedAnalysis(sha1: string,	mode: string,	modelName: string,	searchModel: SearchModel) {
  const now = new Date().toISOString();
  return findOne(COLLECTIONS.analysisRequests, {
    "metadata.sha1": sha1,
    "article.input.mode": mode,
    "metadata.modelName": cleanModelName(modelName),
    "privacy.hiddenAt": { $exists: false },
    "$and": [
      {
        $or: [
          { "privacy.expiresAt": { $exists: false } },
          { "privacy.expiresAt": { $gt: now } },
        ],
      },
      searchModel === "none"
        ? {
            $or: [
              { "metadata.searchModel": "none" },
              { "metadata.searchModel": { $exists: false } },
            ],
          }
        : { "metadata.searchModel": searchModel },
    ],
  });
}

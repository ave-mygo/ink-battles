import type { AnalysisTaskOptions } from "./analysis/types";
import crypto from "crypto-js";
import { ObjectId } from "mongodb";
import { COLLECTIONS, deleteOne, findOne, findOneAndUpdate, updateMany, updateOne, withTransaction } from "../db/mongo";
import { runAnalysisModel } from "../integrations/ai";
import { verifyArticleValue } from "../integrations/validator";
import { writeAuditLog } from "../utils/audit";
import { createProgress, estimateStreamingPercent, updateTaskProgress } from "./analysis-progress";
import { cleanModelName } from "./analysis/cache";
import { forgetAnalysisAbortController, runQueuedAnalysisTask } from "./analysis/queue";
import { loadSearchContext, saveAnalysisResult } from "./analysis/result";
import { refundCallBalance } from "./billing";
import { getCachedEffectiveGradingModelById, getCachedSiteSettingValue } from "./site-settings";

export { canAcceptAnalysisTask, cancelRunningTask, getAnalysisBackpressure, releaseAnalysisTaskSlot, reserveAnalysisTaskSlot } from "./analysis/queue";

const NORMALIZE_TEXT_REGEX = /[\s\p{P}\p{S}]/gu;
const CANCELLED_MESSAGE = "分析任务已取消";
const TASK_TIMEOUT_MESSAGE = "分析任务超时，请稍后重试";
const getStreamLimits = () => {
  const analysisConfig = getCachedSiteSettingValue("analysis.runtime");
  return {
    maxContentSize: analysisConfig.max_output_chars,
    maxTimeoutMs: analysisConfig.task_timeout_ms,
    maxChunks: analysisConfig.stream_max_chunks,
  };
};

interface AnalysisTaskBillingSnapshot {
  billing?: {
    deductedFrom?: "grant" | "paid" | null;
  };
}

/**
 * 计算文章内容的 SHA1 哈希值
 * @param articleText - 文章文本内容
 * @returns SHA1 哈希字符串
 */
export const sha1Article = (articleText: string) => crypto.SHA1(articleText.replace(NORMALIZE_TEXT_REGEX, "")).toString();

/**
 * 恢复因服务重启而中断的分析任务
 * 将所有处于 pending 或 processing 状态的任务标记为 failed
 * @returns 更新操作的结果
 */
export async function recoverInterruptedAnalysisTasks() {
  const now = new Date().toISOString();
  return updateMany(COLLECTIONS.analysisTasks, {
    status: { $in: ["pending", "processing"] },
  }, {
    $set: {
      status: "failed",
      error: "服务重启，未完成的分析任务已中断，请重新提交",
      progress: createProgress("failed", "服务重启，未完成的分析任务已中断，请重新提交", 100),
      updatedAt: now,
    },
  });
}

/**
 * 运行分析任务
 * @param taskId - 任务 ID
 * @param options - 分析任务选项
 * @returns 任务是否成功加入队列
 */
export function runAnalysisTask(taskId: ObjectId, options: AnalysisTaskOptions) {
  return runQueuedAnalysisTask(taskId, options, executeAnalysisTask);
}

/**
 * 执行分析任务的核心流程
 * 包含校验、搜索、流式分析、结果解析与保存等全流程
 * @param taskId - 任务 ID
 * @param options - 分析任务选项
 * @param abortController - 用于取消任务的 AbortController
 */
async function executeAnalysisTask(taskId: ObjectId, options: AnalysisTaskOptions, abortController: AbortController) {
  const key = taskId.toString();
  let timedOut = false;
  const streamLimits = getStreamLimits();
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    abortController.abort(TASK_TIMEOUT_MESSAGE);
  }, streamLimits.maxTimeoutMs);
  try {
    const model = getCachedEffectiveGradingModelById(options.modelId);
    if (!model)
      throw new Error("无效的评分模型");
    await ensureTaskActive(taskId);
    const modelName = cleanModelName(model.model);
    console.log(`[analysis:${taskId}] worker-start model=${modelName} searchModel=${options.searchModel} articleLength=${options.articleText.length}`);
    await logTaskProgress(taskId, options.searchModel === "none"
      ? createProgress("validating", "正在校验文本内容", 12)
      : createProgress("searching", "正在联网搜索并校验文本内容", 12));
    const verification = await verifyArticleValue({ ...options, modelName, signal: abortController.signal });
    if (!verification.success)
      throw new Error(`校验失败: ${verification.error || "文章内容不符合分析标准"}`);

    console.log(`[analysis:${taskId}] validation-passed session=${verification.session || "none"}`);
    await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, { "metadata.session": verification.session || "" });
    await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
      validation: {
        success: true,
        message: options.searchModel === "none" ? "文本审核通过" : "联网审核通过",
        checkedAt: new Date().toISOString(),
      },
    });
    const search = await loadSearchContext(verification.session);
    await logTaskProgress(taskId, createProgress("analyzing", "文本审核通过，模型已开始流式分析", 45), "processing");
    const accumulatedContent = await accumulateStreamContent(taskId, options.fingerprint, async progress =>
      runAnalysisModel({
        articleText: options.articleText,
        mode: options.mode,
        modelId: options.modelId,
        fingerprint: options.fingerprint,
        searchResults: search.searchResults,
        signal: abortController.signal,
        maxOutputChars: streamLimits.maxContentSize,
        onProgress: progress,
      }));

    await logTaskProgress(taskId, createProgress("finalizing", "正在解析结果并写入数据库", 95), "processing");
    await saveAnalysisResult({ taskId, uid: options.uid, accumulatedContent, search, ensureTaskActive });
    if (verification.session) {
      await deleteOne(COLLECTIONS.sessions, { session: verification.session });
    }
  } catch (error) {
    const normalizedError = timedOut && isAbortLikeError(error) ? new Error(TASK_TIMEOUT_MESSAGE) : error;
    if (await shouldTreatAsCancelled(taskId, normalizedError)) {
      await logTaskProgress(taskId, createProgress("cancelled", CANCELLED_MESSAGE, 100), "cancelled");
      if (options.uid)
        await refundTaskCallBalance(taskId, options.uid, "cancelled");
      return;
    }
    if (options.uid)
      await refundTaskCallBalance(taskId, options.uid, "failed");
    await logTaskProgress(taskId, createProgress("failed", formatAnalysisError(normalizedError), 100), "failed");
    await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
      error: formatAnalysisError(normalizedError),
      validation: {
        success: false,
        message: formatAnalysisError(normalizedError),
        checkedAt: new Date().toISOString(),
      },
    });
  } finally {
    clearTimeout(timeoutTimer);
    forgetAnalysisAbortController(key);
  }
}

/**
 * 累积流式内容并监控流式处理的限制
 * @param taskId - 任务 ID
 * @param fingerprint - 任务指纹
 * @param runStream - 执行流式处理的函数
 * @returns 累积的完整内容
 */
async function accumulateStreamContent(taskId: ObjectId,	fingerprint: string,	runStream: (onProgress: (chunk: string, chunkCount: number) => Promise<void>) => Promise<string>) {
  const streamLimits = getStreamLimits();
  const startTime = Date.now();
  const maxTime = startTime + streamLimits.maxTimeoutMs;
  let contentSize = 0;
  let lastChunkLogTime = startTime;
  return runStream(async (chunk, chunkCount) => {
    const now = Date.now();
    contentSize += chunk.length;
    if (now > maxTime)
      throw new Error(`流式处理超时 (${((now - startTime) / 1000).toFixed(1)}s)`);
    if (chunkCount >= streamLimits.maxChunks)
      throw new Error(`流式块数量超过限制 (${streamLimits.maxChunks})`);
    if (contentSize > streamLimits.maxContentSize)
      throw new Error(`流式内容大小超过限制 (${streamLimits.maxContentSize / 1024}KB)`);
    if (chunkCount % 50 === 0)
      await ensureTaskActive(taskId);
    if (chunkCount === 1 || now - lastChunkLogTime >= 5000 || chunkCount % 20 === 0) {
      const elapsedSeconds = ((now - startTime) / 1000).toFixed(1);
      console.log(
        `[analysis:${taskId}] stream-chunk fingerprint=${fingerprint} chunks=${chunkCount} chars=${contentSize} lastChunk=${chunk.length} elapsed=${elapsedSeconds}s`,
      );
      lastChunkLogTime = now;
    }
    if (chunkCount === 1 || chunkCount % 20 === 0) {
      const progress = createProgress("analyzing", `正在接收模型流式输出（${chunkCount} 块）`, estimateStreamingPercent(chunkCount, contentSize), {
        chunkCount,
        contentLength: contentSize,
      });
      await logTaskProgress(taskId, progress, "processing");
    }
  });
}

/**
 * 退还任务扣除的调用次数余额
 * 使用事务保证退款操作的原子性
 * @param taskId - 任务 ID
 * @param uid - 用户 ID
 * @param reason - 退款原因（失败或取消）
 * @returns 是否成功完成退款
 */
async function refundTaskCallBalance(taskId: ObjectId,	uid: number,	reason: "failed" | "cancelled") {
  const refundedAt = new Date().toISOString();
  let refunded = false;
  try {
    await withTransaction(async (session) => {
      const claimedTask = await findOneAndUpdate<AnalysisTaskBillingSnapshot>(COLLECTIONS.analysisTasks, {
        "_id": taskId,
        "billing.deducted": true,
        "billing.refunded": { $ne: true },
        "billing.completedAt": { $exists: false },
      }, {
        $set: {
          "billing.refunded": true,
          "billing.refundedAt": refundedAt,
          "billing.refundReason": reason,
          "updatedAt": refundedAt,
        },
      }, { returnDocument: "before", session });

      const deductedFrom = claimedTask?.billing?.deductedFrom;
      if (deductedFrom !== "grant" && deductedFrom !== "paid")
        return;

      if (!await refundCallBalance(uid, deductedFrom, session))
        throw new Error("退款余额回写失败");
      await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
        $set: {
          "billing.refundBalanceApplied": true,
          "updatedAt": refundedAt,
        },
      }, session);
      refunded = true;
    });
  } catch (error) {
    console.error(`[analysis:${taskId}] refund failed`, error);
    return false;
  }
  if (refunded)
    writeAuditLog({ event: "billing_refunded", uid, metadata: { taskId: taskId.toString(), reason } });
  return refunded;
}

/**
 * 确保任务仍处于活动状态
 * 若任务已被取消则抛出异常
 * @param taskId - 任务 ID
 * @throws 任务不存在或已取消时抛出错误
 */
async function ensureTaskActive(taskId: ObjectId) {
  const task = await findOne(COLLECTIONS.analysisTasks, { _id: taskId });
  if (!task || task.status === "cancelled")
    throw new Error(CANCELLED_MESSAGE);
}

/**
 * 判断错误是否应被视为任务取消
 * @param taskId - 任务 ID
 * @param error - 错误对象
 * @returns 是否应视为取消
 */
async function shouldTreatAsCancelled(taskId: ObjectId, error: unknown) {
  const message = (error as Error).message || "";
  const name = (error as { name?: string }).name || "";
  if (message === CANCELLED_MESSAGE || name === "AbortError" || name === "APIUserAbortError" || message.includes("abort")) {
    const task = await findOne(COLLECTIONS.analysisTasks, { _id: taskId });
    return task?.status === "cancelled" || message === CANCELLED_MESSAGE;
  }
  return false;
}

/**
 * 判断错误是否为中止类型的错误
 * @param error - 错误对象
 * @returns 是否为中止错误
 */
function isAbortLikeError(error: unknown) {
  const message = (error as Error).message || "";
  const name = (error as { name?: string }).name || "";
  return name === "AbortError" || name === "APIUserAbortError" || message.includes("abort");
}

/**
 * 格式化分析错误消息
 * @param error - 错误对象
 * @returns 格式化后的错误消息
 */
function formatAnalysisError(error: unknown) {
  const message = (error as Error).message || "分析失败";
  return message.includes("stream") || message.includes("流式") ? `流式处理失败: ${message}` : message;
}

/**
 * 删除指定的分析任务
 * @param taskId - 任务 ID 字符串
 * @returns 删除操作的结果
 */
export const deleteTask = (taskId: string) => deleteOne(COLLECTIONS.analysisTasks, { _id: new ObjectId(taskId) });

/**
 * 记录任务进度日志并更新数据库
 * @param taskId - 任务 ID
 * @param progress - 进度对象
 * @param status - 可选的任务状态
 */
async function logTaskProgress(taskId: ObjectId, progress: ReturnType<typeof createProgress>, status?: "pending" | "processing" | "completed" | "failed" | "cancelled") {
  console.log(`[analysis:${taskId}] ${progress.stage} ${progress.percent}% ${progress.message}`);
  await updateTaskProgress(taskId, progress, status);
}

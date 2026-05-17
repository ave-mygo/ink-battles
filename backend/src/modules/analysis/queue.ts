import type { AnalysisTaskOptions, AnalysisTaskPool } from "./types";
import { ObjectId } from "mongodb";
import { getAnalysisConfig } from "../../config";
import { COLLECTIONS, updateOne } from "../../db/mongo";
import { createProgress } from "../analysis-progress";

const CANCELLED_MESSAGE = "分析任务已取消";
const analysisConfig = getAnalysisConfig();

interface QueuedAnalysisTask {
  taskId: ObjectId;
  options: AnalysisTaskOptions;
  abortController: AbortController;
}

type AnalysisTaskExecutor = (
  taskId: ObjectId,
  options: AnalysisTaskOptions,
  abortController: AbortController,
) => Promise<void>;

const queuedAnalysisTasks: QueuedAnalysisTask[] = [];
const sponsorQueuedAnalysisTasks: QueuedAnalysisTask[] = [];
const abortControllers = new Map<string, AbortController>();

let runningAnalysisTaskCount = 0;

const reservedAnalysisTaskSlotCounts: Record<AnalysisTaskPool, number> = {
  standard: 0,
  sponsor: 0,
};

/**
 * 获取指定任务池的队列限制
 * @param pool - 任务池类型
 * @returns 队列最大长度
 */
function getQueueLimit(pool: AnalysisTaskPool) {
  return pool === "sponsor" ? analysisConfig.max_sponsor_queued_tasks : analysisConfig.max_queued_tasks;
}

/**
 * 获取指定任务池的队列实例
 * @param pool - 任务池类型
 * @returns 对应的队列数组
 */
function getQueue(pool: AnalysisTaskPool) {
  return pool === "sponsor" ? sponsorQueuedAnalysisTasks : queuedAnalysisTasks;
}

/**
 * 获取分析任务的背压信息
 * 包含运行中、排队中、预留槽位等统计数据
 * @returns 背压统计对象
 */
export function getAnalysisBackpressure() {
  return {
    running: runningAnalysisTaskCount,
    queued: queuedAnalysisTasks.length,
    sponsorQueued: sponsorQueuedAnalysisTasks.length,
    reserved: reservedAnalysisTaskSlotCounts.standard,
    sponsorReserved: reservedAnalysisTaskSlotCounts.sponsor,
    maxRunning: analysisConfig.max_concurrent_tasks,
    maxQueued: analysisConfig.max_queued_tasks,
    maxSponsorQueued: analysisConfig.max_sponsor_queued_tasks,
    accepting: queuedAnalysisTasks.length + reservedAnalysisTaskSlotCounts.standard < analysisConfig.max_queued_tasks,
    sponsorAccepting: sponsorQueuedAnalysisTasks.length + reservedAnalysisTaskSlotCounts.sponsor < analysisConfig.max_sponsor_queued_tasks,
  };
}

/**
 * 检查指定任务池是否可以接受新任务
 * @param pool - 任务池类型
 * @returns 是否可以接受新任务
 */
export function canAcceptAnalysisTask(pool: AnalysisTaskPool) {
  return getQueue(pool).length + reservedAnalysisTaskSlotCounts[pool] < getQueueLimit(pool);
}

/**
 * 预留任务槽位
 * @param pool - 任务池类型
 * @returns 是否成功预留
 */
export function reserveAnalysisTaskSlot(pool: AnalysisTaskPool) {
  if (!canAcceptAnalysisTask(pool))
    return false;
  reservedAnalysisTaskSlotCounts[pool]++;
  return true;
}

/**
 * 释放任务槽位
 * @param pool - 任务池类型
 */
export function releaseAnalysisTaskSlot(pool: AnalysisTaskPool) {
  reservedAnalysisTaskSlotCounts[pool] = Math.max(0, reservedAnalysisTaskSlotCounts[pool] - 1);
}

/**
 * 将分析任务加入队列并触发队列处理
 * @param taskId - 任务 ID
 * @param options - 任务选项
 * @param executeTask - 任务执行器函数
 * @returns 是否成功加入队列
 */
export function runQueuedAnalysisTask(taskId: ObjectId,	options: AnalysisTaskOptions,	executeTask: AnalysisTaskExecutor) {
  const queue = getQueue(options.pool);
  if (queue.length >= getQueueLimit(options.pool))
    return false;
  releaseAnalysisTaskSlot(options.pool);
  const key = taskId.toString();
  const abortController = new AbortController();
  abortControllers.set(key, abortController);
  queue.push({ taskId, options, abortController });
  queueMicrotask(() => drainAnalysisQueue(executeTask));
  return true;
}

/**
 * 取消正在运行或排队中的任务
 * @param taskId - 任务 ID 字符串
 * @returns 更新操作的结果
 */
export async function cancelRunningTask(taskId: string) {
  abortControllers.get(taskId)?.abort(CANCELLED_MESSAGE);
  abortControllers.delete(taskId);
  for (const queue of [queuedAnalysisTasks, sponsorQueuedAnalysisTasks]) {
    const queuedIndex = queue.findIndex(task => task.taskId.toString() === taskId);
    if (queuedIndex >= 0)
      queue.splice(queuedIndex, 1);
  }
  const cancelledAt = new Date().toISOString();
  return updateOne(COLLECTIONS.analysisTasks, { _id: new ObjectId(taskId) }, {
    $set: {
      "status": "cancelled",
      "error": CANCELLED_MESSAGE,
      "progress": createProgress("cancelled", CANCELLED_MESSAGE, 100),
      "billing.cancelRequestedAt": cancelledAt,
      "updatedAt": cancelledAt,
    },
  });
}

/**
 * 从 AbortController 映射中移除指定任务
 * @param taskId - 任务 ID 字符串
 */
export function forgetAnalysisAbortController(taskId: string) {
  abortControllers.delete(taskId);
}

/**
 * 处理队列中的任务
 * 根据并发限制从队列中取出任务并执行
 * @param executeTask - 任务执行器函数
 */
function drainAnalysisQueue(executeTask: AnalysisTaskExecutor) {
  while (runningAnalysisTaskCount < analysisConfig.max_concurrent_tasks && (sponsorQueuedAnalysisTasks.length > 0 || queuedAnalysisTasks.length > 0)) {
    const nextTask = sponsorQueuedAnalysisTasks.shift() ?? queuedAnalysisTasks.shift();
    if (!nextTask)
      return;

    runningAnalysisTaskCount++;
    queueMicrotask(async () => {
      try {
        await executeTask(nextTask.taskId, nextTask.options, nextTask.abortController);
      } finally {
        runningAnalysisTaskCount--;
        drainAnalysisQueue(executeTask);
      }
    });
  }
}

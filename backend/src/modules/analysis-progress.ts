import type { ObjectId } from "mongodb";
import { COLLECTIONS, updateOne } from "../db/mongo";

export type AnalysisStage
  = | "queued"
    | "validating"
    | "searching"
    | "analyzing"
    | "finalizing"
    | "completed"
    | "failed"
    | "cancelled";

export interface AnalysisProgress {
  stage: AnalysisStage;
  message: string;
  percent: number;
  chunkCount?: number;
  contentLength?: number;
  updatedAt: string;
}

/**
 * 创建分析进度对象
 * @param stage - 分析阶段
 * @param message - 进度消息
 * @param percent - 进度百分比（0-100）
 * @param extra - 额外的进度信息（如块数量、内容长度）
 * @returns 分析进度对象
 */
export function createProgress(stage: AnalysisStage,	message: string,	percent: number,	extra: Partial<Pick<AnalysisProgress, "chunkCount" | "contentLength">> = {}): AnalysisProgress {
  return {
    stage,
    message,
    percent,
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

/**
 * 更新任务的进度信息
 * @param taskId - 任务 ID
 * @param progress - 进度对象
 * @param status - 可选的任务状态
 */
export async function updateTaskProgress(taskId: ObjectId,	progress: AnalysisProgress,	status?: "pending" | "processing" | "completed" | "failed" | "cancelled") {
  await updateOne(COLLECTIONS.analysisTasks, { _id: taskId }, {
    ...(status ? { status } : {}),
    progress,
    updatedAt: progress.updatedAt,
  });
}

/**
 * 根据流式处理的块数和内容长度估算进度百分比
 * @param chunkCount - 已接收的块数量
 * @param contentLength - 已接收的内容长度
 * @returns 估算的进度百分比（45-93）
 */
export function estimateStreamingPercent(chunkCount: number, contentLength: number): number {
  const chunkProgress = Math.min(28, Math.floor(chunkCount / 8) * 2);
  const contentProgress = Math.min(20, Math.floor(contentLength / 2400) * 2);
  return Math.min(93, 45 + chunkProgress + contentProgress);
}

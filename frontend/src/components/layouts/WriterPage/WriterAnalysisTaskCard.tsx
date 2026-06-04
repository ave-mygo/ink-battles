"use client";

import type { AnalysisTaskProgress, AnalysisTaskValidation } from "@/utils/analysis";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Loader2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isActiveTask } from "./WriterAnalysisTaskState";

export interface LocalTask {
  taskId: string;
  title: string;
  createdAt: number;
  modeName?: string;
  modelName?: string;
  searchModelName?: string;
  status?: LocalTaskStatus;
  error?: string;
  resultId?: string;
  progress?: AnalysisTaskProgress;
  validation?: AnalysisTaskValidation;
}

export type LocalTaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

interface WriterAnalysisTaskCardProps {
  task: LocalTask;
  cancellingTaskId: string | null;
  elapsedSeconds?: number;
  longAnalysisThreshold: number;
  onCancel: (taskId: string) => void;
  onRemove: (taskId: string) => void;
  onViewResult: (task: LocalTask) => void;
}

export function WriterAnalysisTaskCard({
  task,
  cancellingTaskId,
  elapsedSeconds,
  longAnalysisThreshold,
  onCancel,
  onRemove,
  onViewResult,
}: WriterAnalysisTaskCardProps) {
  return (
    <div className="p-3 border border-slate-200/80 rounded-lg bg-slate-50/90 flex flex-col gap-2 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex gap-3 items-start justify-between">
        <span className="text-sm text-slate-700 font-medium min-w-0 wrap-break-word dark:text-slate-200">
          内容摘选：
          {task.title || "未命名分析"}
        </span>
        {isActiveTask(task)
          ? (
              <AnalysisTaskBadge status="processing" elapsedSeconds={elapsedSeconds} />
            )
          : task.status === "failed" || task.status === "cancelled"
            ? (
                <AnalysisTaskBadge status={task.status} />
              )
            : (
                <AnalysisTaskBadge status="completed" />
              )}
      </div>
      <div className="text-xs text-slate-500 gap-2 grid dark:text-slate-400 sm:grid-cols-3">
        <span>
          评分模式：
          {task.modeName || "默认模式"}
        </span>
        <span>
          模型：
          {task.modelName || "未知模型"}
        </span>
        <span>
          搜索方案：
          {task.searchModelName || "关闭搜索"}
        </span>
      </div>

      {task.progress && (
        <div className="gap-2 grid">
          <div className="text-xs text-slate-600 flex gap-3 items-center justify-between dark:text-slate-300">
            <span>{formatStageLabel(task.progress)}</span>
            <span>
              {task.progress.percent}
              %
              {typeof task.progress.chunkCount === "number" && ` · ${task.progress.chunkCount} 块`}
              {typeof task.progress.contentLength === "number" && ` · ${task.progress.contentLength} 字符`}
            </span>
          </div>
          <Progress value={task.progress.percent} className="h-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">{task.progress.message}</p>
        </div>
      )}

      {task.validation && (
        <p className={`text-xs ${task.validation.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          审核结果：
          {task.validation.message}
        </p>
      )}

      {isActiveTask(task) && (elapsedSeconds ?? 0) >= longAnalysisThreshold && (
        <p className="text-xs text-amber-600 flex gap-1 items-center dark:text-amber-400">
          <AlertTriangle className="shrink-0 h-3 w-3" />
          分析已超过 10 分钟，建议取消该任务后重新提交分析
        </p>
      )}

      {isActiveTask(task) && (
        <div className="mt-1 flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 cursor-pointer"
            onClick={() => onCancel(task.taskId)}
            disabled={cancellingTaskId === task.taskId}
          >
            <XCircle className="mr-1 h-3 w-3" />
            {cancellingTaskId === task.taskId ? "取消中..." : "取消任务"}
          </Button>
        </div>
      )}

      {task.status === "failed" && task.error && (
        <p className="text-xs text-red-500 line-clamp-2 dark:text-red-400">{task.error}</p>
      )}

      {task.status === "cancelled" && task.error && (
        <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">{task.error}</p>
      )}

      {(task.status === "failed" || task.status === "cancelled") && (
        <div className="mt-1 flex gap-2 justify-end">
          <Button size="sm" variant="outline" className="text-xs h-7 cursor-pointer" onClick={() => onRemove(task.taskId)}>
            <Trash2 className="mr-1 h-3 w-3" />
            删除记录
          </Button>
        </div>
      )}

      {task.status === "completed" && (
        <div className="mt-1 flex gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="btn-mygo-rainbow text-xs h-7 cursor-pointer"
            onClick={() => onViewResult(task)}
          >
            <ArrowRight className="mr-1 h-3 w-3" />
            查看结果
          </Button>
        </div>
      )}
    </div>
  );
}

function formatStageLabel(progress: AnalysisTaskProgress): string {
  if (progress.stage === "queued")
    return "排队中";
  if (progress.stage === "validating")
    return "文本校验中";
  if (progress.stage === "searching")
    return "联网搜索中";
  if (progress.stage === "analyzing")
    return "流式分析中";
  if (progress.stage === "finalizing")
    return "结果整理中";
  if (progress.stage === "completed")
    return "分析完成";
  if (progress.stage === "failed")
    return "分析失败";
  return "任务已取消";
}

function AnalysisTaskBadge({ status, elapsedSeconds }: { status: "processing" | "failed" | "completed" | "cancelled"; elapsedSeconds?: number }) {
  if (status === "processing") {
    return (
      <span className="text-xs text-blue-700 font-medium px-2 py-1 rounded bg-blue-100 inline-flex gap-1 shrink-0 items-center dark:text-blue-200 dark:bg-blue-950/70 dark:ring-1 dark:ring-blue-800/60">
        <Loader2 className="h-3 w-3 animate-spin" />
        分析中
        {elapsedSeconds !== undefined && (
          <span className="text-blue-500 ml-0.5 inline-flex gap-0.5 items-center dark:text-blue-300">
            <Clock className="h-2.5 w-2.5" />
            {formatElapsed(elapsedSeconds)}
          </span>
        )}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="text-xs text-red-700 font-medium px-2 py-1 rounded bg-red-100 inline-flex gap-1 shrink-0 items-center dark:text-red-200 dark:bg-red-950/70 dark:ring-1 dark:ring-red-800/60">
        <XCircle className="h-3 w-3" />
        失败
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="text-xs text-slate-700 font-medium px-2 py-1 rounded bg-slate-100 inline-flex gap-1 shrink-0 items-center dark:text-slate-200 dark:bg-slate-800 dark:ring-1 dark:ring-slate-700">
        <XCircle className="h-3 w-3" />
        已取消
      </span>
    );
  }
  return (
    <span className="text-xs text-green-700 font-medium px-2 py-1 rounded bg-green-100 inline-flex gap-1 shrink-0 items-center dark:text-emerald-200 dark:bg-emerald-950/70 dark:ring-1 dark:ring-emerald-800/60">
      <CheckCircle2 className="h-3 w-3" />
      完成
    </span>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

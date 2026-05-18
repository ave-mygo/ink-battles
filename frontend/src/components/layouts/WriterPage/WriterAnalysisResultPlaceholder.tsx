"use client";

import type { AnalysisTaskProgress, AnalysisTaskValidation } from "@/utils/analysis";
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cancelAnalysisTask, deleteAnalysisTask, getAnalysisStatus, openAnalysisStatusStream } from "@/utils/analysis";
import { notifyBillingBalanceUpdated } from "@/utils/billing/client";

interface LocalTask {
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

type LocalTaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

const REFRESH_COOLDOWN = 2000; // 2秒冷却
const LONG_ANALYSIS_THRESHOLD = 600; // 10分钟（秒），超过此阈值提示用户取消重试
const FALLBACK_POLL_INTERVAL = 3000;
const SSE_RECONNECT_DELAY = 3000;

export default function WriterAnalysisResultPlaceholder() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(true);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const healthyStreamTaskIdsRef = useRef<Set<string>>(new Set());
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());
  const router = useRouter();
  // 存储 setTasks 的稳定引用，避免在 useEffect 中直接调用
  const setTasksRef = useRef(setTasks);
  setTasksRef.current = setTasks;
  // SSE 回调会在后续异步触发，这里保留最新任务快照，避免旧闭包覆盖新状态。
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  // 存储 setElapsedSeconds 的稳定引用，避免在 useEffect 中直接调用
  const setElapsedSecondsRef = useRef(setElapsedSeconds);
  setElapsedSecondsRef.current = setElapsedSeconds;

  /**
   * 同步任务列表到组件状态和 localStorage。
   */
  const persistTasks = useCallback((nextTasks: LocalTask[]) => {
    setTasks(nextTasks);
    localStorage.setItem("ink_battles_tasks", JSON.stringify(nextTasks));
    window.dispatchEvent(new Event("ink_battles_tasks_updated"));
  }, []);

  const updateTaskFromSnapshot = useCallback((
    taskId: string,
    snapshot: {
      status?: string;
      error?: string;
      resultId?: string;
      progress?: AnalysisTaskProgress;
      validation?: AnalysisTaskValidation;
    },
  ) => {
    setTasks((previousTasks) => {
      let changed = false;
      const nextTasks = previousTasks.map((task) => {
        if (task.taskId !== taskId)
          return task;

        const normalizedStatus = normalizeTaskStatus(snapshot.status);
        const shouldRefreshBillingBalance
          = task.status !== normalizedStatus
            && (normalizedStatus === "failed" || normalizedStatus === "cancelled");
        const nextTask = {
          ...task,
          status: normalizedStatus,
          error: snapshot.error ?? task.error,
          resultId: snapshot.resultId ?? task.resultId,
          progress: snapshot.progress ?? task.progress,
          validation: snapshot.validation ?? task.validation,
        };

        if (JSON.stringify(task) !== JSON.stringify(nextTask)) {
          changed = true;
          if (shouldRefreshBillingBalance) {
            notifyBillingBalanceUpdated();
          }
          return nextTask;
        }
        return task;
      });

      if (changed) {
        localStorage.setItem("ink_battles_tasks", JSON.stringify(nextTasks));
        window.dispatchEvent(new Event("ink_battles_tasks_updated"));
      }

      return nextTasks;
    });
  }, []);

  // Initial load and listen to custom event
  useEffect(() => {
    const loadTasks = () => {
      try {
        const str = localStorage.getItem("ink_battles_tasks");
        setTasksRef.current(str ? JSON.parse(str) : []);
      } catch (e) {
        console.error("Failed to load tasks", e);
      }
    };

    loadTasks();
    const handleUpdate = () => loadTasks();
    window.addEventListener("ink_battles_tasks_updated", handleUpdate);
    return () => window.removeEventListener("ink_battles_tasks_updated", handleUpdate);
  }, []);

  // 清理所有 timer
  useEffect(() => {
    const eventSources = eventSourcesRef.current;
    const reconnectTimers = reconnectTimersRef.current;
    const healthyStreamTaskIds = healthyStreamTaskIdsRef.current;

    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
      for (const source of eventSources.values()) {
        source.close();
      }
      eventSources.clear();
      for (const timer of reconnectTimers.values()) {
        clearTimeout(timer);
      }
      reconnectTimers.clear();
      healthyStreamTaskIds.clear();
    };
  }, []);

  /**
   * 实时计时器：为每个进行中的任务追踪已用时间
   * 任务完成/失败时将最终耗时保存到 localStorage
   */
  useEffect(() => {
    const activeTasks = tasks.filter(isActiveTask);

    if (activeTasks.length === 0) {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      return;
    }

    // 初始化已用时间
    const now = Date.now();
    setElapsedSecondsRef.current((prev) => {
      const next = { ...prev };
      for (const t of activeTasks) {
        if (!(t.taskId in next)) {
          next[t.taskId] = Math.floor((now - t.createdAt) / 1000);
        }
      }
      return next;
    });

    // 每秒更新计时
    elapsedTimerRef.current = setInterval(() => {
      const currentTime = Date.now();
      setElapsedSecondsRef.current((prev) => {
        const next = { ...prev };
        for (const t of activeTasks) {
          next[t.taskId] = Math.floor((currentTime - t.createdAt) / 1000);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [tasks]);

  /**
   * 当任务完成/失败时，将最终耗时保存到 localStorage
   */
  useEffect(() => {
    for (const task of tasks) {
      if (task.status === "completed" || task.status === "failed") {
        const elapsed = Math.floor((Date.now() - task.createdAt) / 1000);
        try {
          localStorage.setItem(`ink_battles_task_elapsed_${task.taskId}`, String(elapsed));
        } catch {
          // localStorage 写入失败时静默处理
        }
      }
    }
  }, [tasks]);

  /**
   * 拉取进行中任务的最新状态和阶段进度。
   */
  const refreshTaskStatuses = useCallback(async (targetTaskIds?: string[]) => {
    const targetTaskIdSet = targetTaskIds ? new Set(targetTaskIds) : null;
    let updated = false;
    const nextTasks = [...tasksRef.current];

    for (let index = 0; index < nextTasks.length; index++) {
      const task = nextTasks[index];
      if (!isActiveTask(task))
        continue;
      if (targetTaskIdSet && !targetTaskIdSet.has(task.taskId))
        continue;

      try {
        const result = await getAnalysisStatus(task.taskId);
        if (!result.success)
          continue;

        const normalizedStatus = normalizeTaskStatus(result.status);
        const progressChanged = JSON.stringify(task.progress) !== JSON.stringify(result.progress);
        const validationChanged = JSON.stringify(task.validation) !== JSON.stringify(result.validation);
        if (task.status !== normalizedStatus || progressChanged || validationChanged) {
          task.status = normalizedStatus;
          task.progress = result.progress;
          task.validation = result.validation;
          updated = true;
        }

        if (normalizedStatus === "completed" && result.resultId) {
          task.resultId = result.resultId;
          task.error = undefined;
          updated = true;
        } else if (normalizedStatus === "failed" || normalizedStatus === "cancelled") {
          task.error = result.error || task.error;
          updated = true;
        }
      } catch {
        // 网络波动时保留本地快照，不中断其他任务刷新。
      }
    }

    if (updated) {
      persistTasks(nextTasks);
    }
  }, [persistTasks]);

  /**
   * 关闭指定任务的 SSE 与重连定时器，避免任务结束后残留后台连接。
   */
  const cleanupTaskRealtimeResources = useCallback((taskId: string) => {
    eventSourcesRef.current.get(taskId)?.close();
    eventSourcesRef.current.delete(taskId);
    healthyStreamTaskIdsRef.current.delete(taskId);
    const reconnectTimer = reconnectTimersRef.current.get(taskId);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimersRef.current.delete(taskId);
    }
  }, []);

  /**
   * 为任务建立 SSE 订阅。
   * 当流式更新稳定后，该任务不再参与兜底轮询；只有断线时才恢复补偿拉取。
   */
  const connectTaskStatusStream = useCallback((taskId: string) => {
    if (eventSourcesRef.current.has(taskId))
      return;

    const source = openAnalysisStatusStream(taskId, {
      onSnapshot: (snapshot) => {
        healthyStreamTaskIdsRef.current.add(taskId);
        updateTaskFromSnapshot(taskId, snapshot);
      },
      onEnd: () => {
        cleanupTaskRealtimeResources(taskId);
      },
      onError: () => {
        cleanupTaskRealtimeResources(taskId);
        void refreshTaskStatuses([taskId]);
        const reconnectTimer = setTimeout(() => {
          reconnectTimersRef.current.delete(taskId);
          connectTaskStatusStream(taskId);
        }, SSE_RECONNECT_DELAY);
        reconnectTimersRef.current.set(taskId, reconnectTimer);
      },
    });

    eventSourcesRef.current.set(taskId, source);
  }, [cleanupTaskRealtimeResources, refreshTaskStatuses, updateTaskFromSnapshot]);

  useEffect(() => {
    const activeTaskIds = new Set(tasks.filter(isActiveTask).map(task => task.taskId));
    const taskIdsNeedingBootstrap: string[] = [];

    for (const [taskId, source] of eventSourcesRef.current.entries()) {
      if (!activeTaskIds.has(taskId)) {
        source.close();
        cleanupTaskRealtimeResources(taskId);
      }
    }

    for (const [taskId, timer] of reconnectTimersRef.current.entries()) {
      if (!activeTaskIds.has(taskId)) {
        clearTimeout(timer);
        reconnectTimersRef.current.delete(taskId);
      }
    }

    for (const taskId of activeTaskIds) {
      if (!eventSourcesRef.current.has(taskId) && !healthyStreamTaskIdsRef.current.has(taskId)) {
        taskIdsNeedingBootstrap.push(taskId);
      }
      connectTaskStatusStream(taskId);
    }

    if (taskIdsNeedingBootstrap.length > 0) {
      void refreshTaskStatuses(taskIdsNeedingBootstrap);
    }
  }, [connectTaskStatusStream, cleanupTaskRealtimeResources, refreshTaskStatuses, tasks]);

  /**
   * 手动刷新任务状态
   * 带有2秒冷却时间，避免频繁请求
   */
  const handleRefreshStatus = async () => {
    if (!canRefresh || isRefreshing)
      return;

    setIsRefreshing(true);
    setCanRefresh(false);
    setCooldownRemaining(Math.ceil(REFRESH_COOLDOWN / 1000));

    // 启动倒计时
    intervalRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 启动冷却计时器
    cooldownTimerRef.current = setTimeout(() => {
      setCanRefresh(true);
      setCooldownRemaining(0);
    }, REFRESH_COOLDOWN);

    try {
      await refreshTaskStatuses();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const fallbackTaskIds = tasks
      .filter(task => isActiveTask(task) && !healthyStreamTaskIdsRef.current.has(task.taskId))
      .map(task => task.taskId);

    if (fallbackTaskIds.length === 0)
      return;

    const timer = setInterval(() => {
      void refreshTaskStatuses(fallbackTaskIds);
    }, FALLBACK_POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [refreshTaskStatuses, tasks]);

  const cancelTask = async (taskId: string) => {
    setCancellingTaskId(taskId);

    try {
      const result = await cancelAnalysisTask(taskId);

      if (!result.success) {
        throw new Error(result.error || "取消任务失败");
      }

      const newTasks = tasks.filter(task => task.taskId !== taskId);
      persistTasks(newTasks);
      notifyBillingBalanceUpdated();
      toast.success("已取消该分析任务");
    } catch (error) {
      toast.error((error as Error).message || "取消任务失败，请稍后重试");
    } finally {
      setCancellingTaskId(null);
    }
  };

  const removeTask = (taskId: string) => {
    const newTasks = tasks.filter(t => t.taskId !== taskId);
    persistTasks(newTasks);
    // 失败任务和已取消任务可以安全删除服务端记录，避免历史任务表堆积。
    deleteAnalysisTask(taskId).catch(console.error);
  };

  /**
   * 处理"查看结果"点击
   * 清理本地任务记录后跳转到结果页面（带锚点定位到分析结果）
   */
  const handleViewResult = async (task: LocalTask) => {
    if (!task.resultId)
      return;

    // Clean up local storage task record
    const newTasks = tasks.filter(t => t.taskId !== task.taskId);
    persistTasks(newTasks);

    // Navigate using taskId (one-time access token)
    router.push(`/analysis/${task.taskId}#analysis-results`);
  };

  // 判断是否有进行中的任务
  const hasActiveTasks = tasks.some(isActiveTask);

  if (tasks.length === 0) {
    return (
      <Card className="border border-slate-200/70 bg-white/80 shadow-lg backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80">
        <CardContent className="py-12 text-center">
          <div className="text-slate-400 mb-4 dark:text-slate-500">
            <BarChart3 className="mx-auto h-16 w-16" />
          </div>
          <h3 className="text-lg text-slate-700 font-medium mb-2 dark:text-slate-200">等待分析</h3>
          <p className="text-slate-500 dark:text-slate-400">请输入作品内容并点击"开始战力评测"按钮</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200/70 bg-white/80 shadow-lg backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/80">
      <CardHeader className="pb-3 border-b border-slate-100/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-slate-700 flex gap-2 items-center dark:text-slate-100">
            <BarChart3 className="text-blue-500 h-5 w-5 dark:text-blue-400" />
            等待分析
          </CardTitle>
          {hasActiveTasks && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="btn-mygo-rainbow text-xs text-white h-8 cursor-pointer shadow-sm"
                  onClick={handleRefreshStatus}
                  disabled={!canRefresh || isRefreshing}
                >
                  {isRefreshing
                    ? (
                        <>
                          <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
                          查询中...
                        </>
                      )
                    : cooldownRemaining > 0
                      ? (
                          <>
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                            刷新进度 (
                            {cooldownRemaining}
                            s)
                          </>
                        )
                      : (
                          <>
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                            刷新进度
                          </>
                        )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-center max-w-60">
                <p>向服务器查询分析任务的最新进度，不会重新开始分析</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-3">
        {tasks.map(task => (
          <div
            key={task.taskId}
            className="p-3 border border-slate-200/80 rounded-lg bg-slate-50/90 flex flex-col gap-2 dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="flex gap-3 items-start justify-between">
              <span className="text-sm text-slate-700 font-medium min-w-0 wrap-break-word dark:text-slate-200">
                内容摘选：
                {task.title || "未命名分析"}
              </span>
              {isActiveTask(task)
                ? (
                    <Badge status="processing" elapsedSeconds={elapsedSeconds[task.taskId]} />
                  )
                : task.status === "failed" || task.status === "cancelled"
                  ? (
                      <Badge status={task.status} />
                    )
                  : (
                      <Badge status="completed" />
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

            {/* 超时提示：分析用时超过 10 分钟时提示取消重试 */}
            {isActiveTask(task)
              && (elapsedSeconds[task.taskId] ?? 0) >= LONG_ANALYSIS_THRESHOLD && (
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
                  onClick={() => cancelTask(task.taskId)}
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
                <Button size="sm" variant="outline" className="text-xs h-7 cursor-pointer" onClick={() => removeTask(task.taskId)}>
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
                  onClick={() => handleViewResult(task)}
                >
                  <ArrowRight className="mr-1 h-3 w-3" />
                  查看结果
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * 格式化秒数为 Xm Ys 格式
 */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

/**
 * 判断任务是否仍处于可取消、可刷新状态。
 */
function isActiveTask(task: LocalTask): boolean {
  return task.status === "pending" || task.status === "processing" || !task.status;
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

/**
 * 将服务端状态归一化为本地可识别状态，避免未知状态破坏渲染分支。
 */
function normalizeTaskStatus(status: unknown): LocalTaskStatus {
  if (status === "pending" || status === "processing" || status === "completed" || status === "failed" || status === "cancelled") {
    return status;
  }

  return "processing";
}

function Badge({ status, elapsedSeconds }: { status: "processing" | "failed" | "completed" | "cancelled"; elapsedSeconds?: number }) {
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

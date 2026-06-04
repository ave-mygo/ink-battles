"use client";

import type { LocalTask } from "./WriterAnalysisTaskCard";
import type { AnalysisTaskProgress, AnalysisTaskValidation } from "@/utils/analysis";
import { BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelAnalysisTask, deleteAnalysisTask, getAnalysisStatus, openAnalysisStatusStream } from "@/utils/analysis";
import { notifyBillingBalanceUpdated } from "@/utils/billing/client";
import { WriterAnalysisTaskCard } from "./WriterAnalysisTaskCard";
import { isActiveTask, normalizeTaskStatus } from "./WriterAnalysisTaskState";

const LONG_ANALYSIS_THRESHOLD = 600; // 10分钟（秒），超过此阈值提示用户取消重试
const FALLBACK_POLL_INTERVAL = 3000;
const SSE_RECONNECT_DELAY = 3000;

export default function WriterAnalysisResultPlaceholder() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
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
        <CardTitle className="text-lg text-slate-700 flex gap-2 items-center dark:text-slate-100">
          <BarChart3 className="text-blue-500 h-5 w-5 dark:text-blue-400" />
          等待分析
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-3">
        {tasks.map(task => (
          <WriterAnalysisTaskCard
            key={task.taskId}
            task={task}
            cancellingTaskId={cancellingTaskId}
            elapsedSeconds={elapsedSeconds[task.taskId]}
            longAnalysisThreshold={LONG_ANALYSIS_THRESHOLD}
            onCancel={cancelTask}
            onRemove={removeTask}
            onViewResult={handleViewResult}
          />
        ))}
      </CardContent>
    </Card>
  );
}

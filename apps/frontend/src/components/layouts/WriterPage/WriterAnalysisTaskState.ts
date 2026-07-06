import type { LocalTask, LocalTaskStatus } from "./WriterAnalysisTaskCard";

export function isActiveTask(task: LocalTask): boolean {
  return task.status === "pending" || task.status === "processing" || !task.status;
}

export function normalizeTaskStatus(status: unknown): LocalTaskStatus {
  if (status === "pending" || status === "processing" || status === "completed" || status === "failed" || status === "cancelled") {
    return status;
  }

  return "processing";
}

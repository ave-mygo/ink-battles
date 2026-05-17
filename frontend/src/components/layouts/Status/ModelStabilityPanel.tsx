import type { ConfiguredStatusModel, UsageLog } from "@ink-battles/shared/types/common/status";
import { Activity, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type StabilityStatus = "stable" | "unstable" | "unknown";

interface ModelStabilityPanelProps {
  models: ConfiguredStatusModel[];
  logs: UsageLog[];
  className?: string;
}

interface ModelStabilityResult {
  model: ConfiguredStatusModel;
  status: StabilityStatus;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  successRate: number;
  minRetries: number;
  maxRetries: number;
  averageRetries: number;
}

const STABLE_SUCCESS_RATE_THRESHOLD = 90;

const normalizeModelName = (modelName: string) =>
  modelName
    .trim()
    .toLowerCase()
    .replace(/^.*\//, "");

const getRetryCount = (log: UsageLog) => Math.max((log.attempt_count ?? 1) - 1, 0);

/**
 * 通过已加载日志判断模型稳定性。
 *
 * 1. 成功率大于等于 90%，判定为 stable。
 * 2. 成功率低于 90%，判定为 unstable。
 * 3. 没有可观察日志时不做稳定性断言，显示为 unknown。
 */
const analyzeModelStability = (model: ConfiguredStatusModel, logs: UsageLog[]): ModelStabilityResult => {
  const normalizedModel = normalizeModelName(model.model);
  const modelLogs = logs.filter(log => normalizeModelName(log.model_name) === normalizedModel);
  const retryCounts = modelLogs.map(getRetryCount);
  const failedRequests = modelLogs.filter(log => log.quota <= 0).length;
  const minRetries = retryCounts.length ? Math.min(...retryCounts) : 0;
  const maxRetries = retryCounts.length ? Math.max(...retryCounts) : 0;
  const averageRetries = retryCounts.length
    ? retryCounts.reduce((sum, count) => sum + count, 0) / retryCounts.length
    : 0;
  const successRequests = modelLogs.length - failedRequests;
  const successRate = modelLogs.length ? (successRequests / modelLogs.length) * 100 : 0;

  const status: StabilityStatus = modelLogs.length === 0
    ? "unknown"
    : successRate < STABLE_SUCCESS_RATE_THRESHOLD
      ? "unstable"
      : "stable";

  return {
    model,
    status,
    totalRequests: modelLogs.length,
    successRequests,
    failedRequests,
    successRate,
    minRetries,
    maxRetries,
    averageRetries,
  };
};

const sortStabilityResults = (left: ModelStabilityResult, right: ModelStabilityResult) => {
  const rank: Record<StabilityStatus, number> = { unstable: 0, stable: 1, unknown: 2 };
  const rankDelta = rank[left.status] - rank[right.status];
  if (rankDelta !== 0)
    return rankDelta;

  return right.totalRequests - left.totalRequests || left.model.name.localeCompare(right.model.name);
};

const getStatusMeta = (status: StabilityStatus) => {
  if (status === "stable") {
    return {
      label: "stable",
      icon: CheckCircle2,
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }

  if (status === "unstable") {
    return {
      label: "unstable",
      icon: AlertTriangle,
      badgeClassName: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    };
  }

  return {
    label: "no data",
    icon: MinusCircle,
    badgeClassName: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
  };
};

export default function ModelStabilityPanel({ models, logs, className }: ModelStabilityPanelProps) {
  const stabilityResults = models
    .map(model => analyzeModelStability(model, logs))
    .sort(sortStabilityResults);
  const unstableCount = stabilityResults.filter(result => result.status === "unstable").length;
  const stableCount = stabilityResults.filter(result => result.status === "stable").length;

  return (
    <Card className={cn("min-w-0 h-[calc(100vh-7rem)] overflow-hidden border border-slate-200 bg-white shadow-lg flex flex-col dark:border-slate-800 dark:bg-slate-950", className)}>
      <CardHeader className="px-5 shrink-0 gap-2">
        <CardTitle className="text-slate-800 flex gap-2 items-center dark:text-slate-100">
          <Activity className="text-emerald-600 h-5 w-5 dark:text-emerald-400" />
          模型稳定分析
        </CardTitle>
        <CardDescription>
          成功率低于
          {" "}
          {STABLE_SUCCESS_RATE_THRESHOLD}
          % 标记为 unstable
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 flex flex-1 flex-col min-h-0">
        <div className="text-sm px-5 pb-4 flex shrink-0 flex-wrap gap-2">
          <span className="text-emerald-700 dark:text-emerald-300">
            {stableCount}
            {" "}
            stable
          </span>
          <span className="text-red-700 dark:text-red-300">
            {unstableCount}
            {" "}
            unstable
          </span>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 pb-5 flex flex-col gap-3">
            {stabilityResults.map((result) => {
              const statusMeta = getStatusMeta(result.status);
              const StatusIcon = statusMeta.icon;

              return (
                <div
                  key={`${result.model.source}:${result.model.id}:${result.model.model}`}
                  className="p-3 border border-slate-200 rounded-lg bg-slate-50/80 flex flex-col gap-2 min-w-0 overflow-hidden dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex gap-3 min-w-0 items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 font-semibold truncate dark:text-slate-100" title={result.model.name}>
                        {result.model.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate dark:text-slate-400" title={result.model.model}>
                        {result.model.model}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 max-w-28", statusMeta.badgeClassName)}>
                      <StatusIcon />
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 gap-2 grid grid-cols-2 dark:text-slate-400">
                    <span>
                      请求
                      {" "}
                      <b className="text-slate-700 dark:text-slate-200">{result.totalRequests}</b>
                    </span>
                    <span>
                      成功
                      {" "}
                      <b className="text-slate-700 dark:text-slate-200">{result.successRequests}</b>
                    </span>
                    <span>
                      失败
                      {" "}
                      <b className="text-slate-700 dark:text-slate-200">{result.failedRequests}</b>
                    </span>
                    <span>
                      成功率
                      {" "}
                      <b className="text-slate-700 dark:text-slate-200">
                        {result.totalRequests ? result.successRate.toFixed(1) : "--"}
                        {result.totalRequests ? "%" : ""}
                      </b>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    重试范围：
                    {result.minRetries}
                    -
                    {result.maxRetries}
                    {" "}
                    次，平均
                    {" "}
                    {result.averageRetries.toFixed(1)}
                    {" "}
                    次
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

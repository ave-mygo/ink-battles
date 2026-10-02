"use client";

import { Clock, Info, Zap } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFingerprintId } from "@/lib/fingerprint";
import { cn } from "@/lib/utils";
import { useIsAuthenticated } from "@/store";
import { createClientEden } from "@/utils/api/eden-client";

interface FreeQuota {
  remaining: number;
  capacity: number;
  refillMs: number;
  nextRefillAt: string | null;
}

/**
 * 展示后端实际免费额度，在提交结束、登录变化及冷却恢复后刷新。
 * @param props - 当前是否正在提交分析任务
 * @returns 用户权益区域内的免费额度面板
 */
export function WriterFreeQuota({ isAnalyzing }: { isAnalyzing: boolean }): React.JSX.Element {
  const isAuthenticated = useIsAuthenticated();
  const [quota, setQuota] = useState<FreeQuota | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const rulesId = useId();

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    setQuota(null);
    setFailed(false);

    /** 查询额度，不领取或消耗免费次数。 */
    const refresh = async (): Promise<void> => {
      try {
        const fingerprint = await getFingerprintId();
        const response = await createClientEden().api.v2.analysis["free-quota"].post({ fingerprint });
        if (cancelled)
          return;
        if (response.error || !response.data?.success)
          throw new Error("加载免费额度失败");
        setQuota(response.data.data);
        setFailed(false);
        setNow(Date.now());
        const next = response.data.data.nextRefillAt;
        const delay = next ? Math.max(1000, Math.min(30000, Date.parse(next) - Date.now() + 100)) : 30000;
        timer = window.setTimeout(() => { void refresh(); }, delay);
      } catch {
        if (!cancelled) {
          setQuota(null);
          setFailed(true);
          timer = window.setTimeout(() => { void refresh(); }, 30000);
        }
      }
    };
    void refresh();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [isAuthenticated, isAnalyzing]);

  const seconds = quota?.nextRefillAt ? Math.max(0, Math.ceil((Date.parse(quota.nextRefillAt) - now) / 1000)) : 0;

  return (
    <section aria-label="免费使用额度" className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Zap className="size-3.5" aria-hidden="true" />
            免费次数
          </h3>
          {quota
            ? (
                <>
                  <p role="status" className="text-sm font-semibold tabular-nums text-foreground">
                    {quota.remaining}
                    <span className="font-normal text-muted-foreground"> / {quota.capacity}</span>
                    <span className="sr-only"> 次可用</span>
                  </p>
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {Array.from({ length: quota.capacity }, (_, slot) => (
                      <span
                        key={slot}
                        className={cn(
                          "size-2 rounded-full border",
                          slot < quota.remaining
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40 bg-transparent",
                        )}
                      />
                    ))}
                  </div>
                </>
              )
            : !failed && <Skeleton className="h-5 w-12" />}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer px-2 active:bg-accent"
          aria-expanded={showRules}
          aria-controls={rulesId}
          onClick={() => setShowRules(value => !value)}
        >
          <Info data-icon="inline-start" aria-hidden="true" />
          额度说明
        </Button>
      </div>

      {quota
        ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-relaxed text-muted-foreground">
              <span>用后 {quota.refillMs / 60000} 分钟恢复</span>
              {quota.nextRefillAt
                ? (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 shrink-0" aria-hidden="true" />
                      下次
                      <span className="font-medium tabular-nums text-foreground">
                        {seconds > 0 ? `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` : "更新中"}
                      </span>
                    </span>
                  )
                : <span>次数已满</span>}
            </div>
          )
        : (
            <p role="status" className="text-xs leading-relaxed text-muted-foreground">
              {failed ? "暂时无法获取额度，稍后自动更新。" : "正在查询剩余次数…"}
            </p>
          )}

      <div id={rulesId} hidden={!showRules} className="space-y-1.5 pt-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">免费次数不用等明天！</span>
          最多能存 {quota?.capacity ?? 3} 次。用掉的次数会排队恢复，每过 {quota ? quota.refillMs / 60000 : "几"} 分钟自动补回 1 次。
        </p>
        <p>
          {isAuthenticated
            ? "注：高级模型单独计费，不扣免费次数。"
            : "注：没登录时系统只认浏览器和网络。如果同一个 Wi-Fi 下别人用过了，也会扣你的次数。"}
        </p>
      </div>
    </section>
  );
}

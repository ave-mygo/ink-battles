import { Skeleton } from "@/components/ui/skeleton";

/**
 * 优惠码管理页加载状态。
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

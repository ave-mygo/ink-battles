import { Skeleton } from "@/components/ui/skeleton";

/**
 * 用户自定义句子上传页加载骨架。
 */
export default function CustomSentenceUploadLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="mb-8 space-y-3 text-center">
        <Skeleton className="mx-auto size-14 rounded-2xl" />
        <Skeleton className="mx-auto h-10 w-56" />
        <Skeleton className="mx-auto h-5 max-w-2xl w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Skeleton className="h-[34rem] rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}

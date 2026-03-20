import { Skeleton } from "@/components/ui/skeleton";

/**
 * 历史记录详情页面加载骨架屏
 * 在服务器组件渲染期间立即展示，提供流式加载体验
 */
export default function HistoryDetailLoading() {
	return (
		<div className="mx-auto max-w-6xl space-y-6">
			{/* 返回按钮骨架 */}
			<div className="flex gap-4 items-center">
				<Skeleton className="rounded-md h-8 w-28" />
			</div>

			{/* 基本信息卡片骨架 */}
			<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				<div className="p-6 pb-3">
					<div className="flex gap-4 items-start justify-between">
						<div className="space-y-2">
							<div className="flex gap-2">
								<Skeleton className="h-5 w-20" />
								<Skeleton className="h-5 w-16" />
							</div>
							<div className="flex gap-3">
								<Skeleton className="h-3.5 w-24" />
								<Skeleton className="h-3.5 w-20" />
							</div>
						</div>
						<Skeleton className="rounded-md h-8 w-24" />
					</div>
				</div>
				<div className="px-6 pb-6 space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-4 w-3/5" />
				</div>
			</div>

			{/* 分析结果骨架 */}
			<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				<div className="p-6 pb-3 space-y-1.5">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-4 w-36" />
				</div>
				<div className="px-6 pb-6 space-y-5">
					{/* 总分区域 */}
					<div className="py-4 flex flex-col gap-2 items-center">
						<Skeleton className="rounded-full h-16 w-16" />
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-4 w-40" />
					</div>
					{/* 各项得分 */}
					<div className="gap-4 grid md:grid-cols-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="p-4 border border-slate-200/40 rounded-xl space-y-2 dark:border-slate-700/50"
							>
								<div className="flex justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-12" />
								</div>
								<Skeleton className="rounded-full h-2 w-full" />
							</div>
						))}
					</div>
					{/* 评语区域 */}
					<div className="space-y-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>
				</div>
			</div>
		</div>
	);
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * 历史记录页面加载骨架屏
 * 在服务器组件渲染期间立即展示，提供流式加载体验
 */
export default function HistoryLoading() {
	return (
		<div className="mx-auto max-w-6xl space-y-6">
			{/* 页面标题骨架 */}
			<div className="mb-2 flex gap-3 items-center">
				<Skeleton className="rounded-xl h-10 w-10" />
				<div className="space-y-2">
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-4 w-48" />
				</div>
			</div>

			{/* 记录卡片骨架 */}
			<div className="gap-6 grid md:grid-cols-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className="group border-0 rounded-xl bg-white/80 flex flex-col shadow-lg overflow-hidden backdrop-blur-sm dark:bg-slate-900/80"
					>
						{/* CardHeader 骨架 */}
						<div className="p-6 pb-3 space-y-3">
							<div className="flex gap-4 items-start justify-between">
								<div className="space-y-2">
									<div className="flex gap-2">
										<Skeleton className="h-5 w-20" />
										<Skeleton className="h-5 w-14" />
									</div>
									<div className="flex gap-3">
										<Skeleton className="h-3.5 w-20" />
										<Skeleton className="h-3.5 w-24" />
									</div>
								</div>
								<div className="flex flex-col items-end">
									<Skeleton className="h-8 w-12" />
									<Skeleton className="mt-1 h-3 w-8" />
								</div>
							</div>
						</div>
						{/* CardContent 骨架 */}
						<div className="px-6 pb-3 flex-1 space-y-3">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-4/5" />
							<Skeleton className="h-4 w-3/5" />
							<div className="pt-1 flex gap-1.5">
								<Skeleton className="h-5 w-12" />
								<Skeleton className="h-5 w-16" />
								<Skeleton className="h-5 w-10" />
							</div>
						</div>
						{/* Footer 骨架 */}
						<div className="px-6 py-3 border-t border-slate-100/50 flex items-center justify-between dark:border-slate-700/30">
							<div className="flex gap-2">
								<Skeleton className="h-8 w-20" />
								<Skeleton className="h-8 w-8" />
							</div>
							<Skeleton className="h-8 w-24" />
						</div>
					</div>
				))}
			</div>

			{/* 分页骨架 */}
			<div className="pt-4 flex items-center justify-between">
				<Skeleton className="h-4 w-40" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-8 w-20" />
				</div>
			</div>
		</div>
	);
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * 系统状态页面加载骨架屏
 * StatusHeader + 四列统计卡片 + 日志列表
 */
export default function StatusLoading() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-7xl">
				{/* StatusHeader 骨架 */}
				<div className="mb-8 text-center">
					<div className="mb-4 flex gap-4 items-center justify-center">
						<Skeleton className="rounded-xl h-14 w-14" />
						<Skeleton className="h-10 w-36" />
					</div>
					<Skeleton className="mx-auto h-5 w-64" />
				</div>

				{/* 四列统计卡片骨架 */}
				<div className="mb-8 gap-6 grid lg:grid-cols-4 md:grid-cols-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="border-0 rounded-xl shadow-lg overflow-hidden dark:bg-slate-800/50"
						>
							<div className="p-6 pb-3">
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="rounded h-5 w-5" />
								</div>
							</div>
							<div className="px-6 pb-6">
								<Skeleton className="mb-2 h-8 w-24" />
							</div>
						</div>
					))}
				</div>

				{/* 日志列表区域骨架 */}
				<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-800/60">
					<div className="p-6 pb-3 space-y-1.5">
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-4 w-48" />
					</div>
					<div className="px-6 pb-6 space-y-3">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="p-4 border border-slate-200/40 rounded-xl flex items-center justify-between dark:border-slate-700/50"
							>
								<div className="flex gap-3 items-center">
									<Skeleton className="rounded-full h-2.5 w-2.5" />
									<div className="space-y-1.5">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3.5 w-24" />
									</div>
								</div>
								<div className="flex gap-6 items-center">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-4 w-12" />
									<Skeleton className="rounded-full h-5 w-14" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

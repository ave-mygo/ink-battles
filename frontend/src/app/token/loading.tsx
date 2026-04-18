import { Skeleton } from "@/components/ui/skeleton";

/**
 * Token 管理页面加载骨架屏
 * TokenHeader + 两列内容卡片
 */
export default function TokenLoading() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				{/* TokenHeader 骨架 */}
				<div className="mb-8 text-center">
					<div className="mb-6 flex gap-4 items-center justify-center">
						<Skeleton className="rounded-2xl h-16 w-16" />
						<Skeleton className="h-12 w-36" />
					</div>
					{/* 提示卡片 */}
					<div className="mb-8 p-8 rounded-xl bg-white/80 shadow-lg dark:bg-slate-800/60">
						<Skeleton className="mx-auto mb-6 h-7 max-w-lg w-5/6" />
						<div className="flex flex-wrap gap-4 justify-center">
							<Skeleton className="rounded-full h-12 w-28" />
							<Skeleton className="rounded-full h-12 w-28" />
						</div>
					</div>
				</div>

				{/* 两列内容卡片 */}
				<div className="gap-6 grid md:grid-cols-2">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={i}
							className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-800/60"
						>
							<div className="p-6 pb-3 space-y-1.5">
								<Skeleton className="h-5 w-24" />
								<Skeleton className="h-4 w-36" />
							</div>
							<div className="px-6 pb-6 space-y-3">
								{/* 限额信息块 */}
								{Array.from({ length: 2 }).map((_, j) => (
									<div
										key={j}
										className="p-4 rounded-lg bg-slate-50 space-y-2 dark:bg-slate-700/30"
									>
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-3/4" />
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

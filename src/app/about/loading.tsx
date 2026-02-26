import { Skeleton } from "@/components/ui/skeleton";

/**
 * 关于页面加载骨架屏
 * 标题区 + CTA 卡片 + 内容卡片（段落列表）
 */
export default function AboutLoading() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				{/* 标题区骨架 */}
				<div className="mb-8 text-center">
					<div className="mb-6 flex gap-4 items-center justify-center">
						<Skeleton className="rounded-2xl h-16 w-16" />
						<Skeleton className="h-12 w-40" />
					</div>

					{/* CTA 卡片 */}
					<div className="mb-8 p-8 rounded-2xl bg-white/80 shadow-lg dark:bg-slate-800/60">
						<Skeleton className="mx-auto mb-4 h-7 max-w-xl w-3/4" />
						<Skeleton className="mx-auto mb-6 h-7 max-w-md w-1/2" />
						<div className="flex flex-wrap gap-4 justify-center">
							<Skeleton className="rounded-full h-12 w-28" />
							<Skeleton className="rounded-full h-12 w-28" />
						</div>
					</div>
				</div>

				{/* 内容卡片骨架 */}
				<div className="p-6 rounded-2xl bg-white/80 shadow-lg md:p-10 dark:bg-slate-900/60">
					<div className="space-y-10">
						{/* 段落块 × 3 */}
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="space-y-3">
								<Skeleton className="h-7 w-32" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
							</div>
						))}

						{/* 创作理念引用块 */}
						<div className="p-6 border-l-4 border-blue-300 rounded-r-lg bg-slate-50/80 space-y-2 dark:border-blue-400/40 dark:bg-slate-800/50">
							<Skeleton className="h-5 w-24" />
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-4 w-full" />
							))}
						</div>

						{/* 分隔线 */}
						<Skeleton className="h-px w-full" />

						{/* FAQ 骨架 */}
						<div className="space-y-3">
							<Skeleton className="h-6 w-24" />
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={i}
									className="p-4 border border-slate-200/60 rounded-xl space-y-2 dark:border-slate-700/50"
								>
									<Skeleton className="h-5 w-3/4" />
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-5/6" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

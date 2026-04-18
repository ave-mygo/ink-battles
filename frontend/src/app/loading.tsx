import { Skeleton } from "@/components/ui/skeleton";

/**
 * 首页加载骨架屏
 * force-dynamic SSR 渲染期间展示，与 WriterAnalysisSystem 布局保持一致
 */
export default function HomeLoading() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-6 container max-w-7xl sm:py-8">
				{/* WriterAnalysisHeader 骨架 */}
				<div className="mb-8 text-center">
					<div className="mb-6 flex flex-col gap-4 items-center justify-center sm:flex-row sm:gap-6">
						{/* 图标 */}
						<Skeleton className="rounded-xl h-16 w-16" />
						{/* 标题 */}
						<Skeleton className="h-10 w-64 sm:w-72" />
					</div>
					{/* 副标题 */}
					<Skeleton className="mx-auto mb-6 h-6 max-w-lg w-full" />
					{/* 快速链接按钮组 */}
					<div className="mx-auto max-w-3xl w-full">
						<div className="flex flex-wrap gap-4 justify-center">
							{Array.from({ length: 6 }).map((_, i) => (
								<Skeleton key={i} className="rounded-lg h-10 w-36" />
							))}
						</div>
					</div>
				</div>

				{/* 主内容区 - 输入 + 模型选择 并排 */}
				<div className="mb-6 gap-6 grid lg:gap-8 lg:grid-cols-8">
					{/* WriterAnalysisInput 骨架（左列 5/8） */}
					<div className="lg:col-span-5">
						<div className="border-0 rounded-xl bg-white/80 shadow-lg overflow-hidden backdrop-blur-sm dark:bg-slate-900/80">
							<div className="p-6 pb-3 space-y-1.5">
								<div className="flex gap-2 items-center">
									<Skeleton className="h-5 w-5" />
									<Skeleton className="h-5 w-24" />
								</div>
								<Skeleton className="h-4 w-48" />
							</div>
							<div className="px-6 pb-6 space-y-4">
								{/* 用户等级信息行 */}
								<div className="flex gap-2 items-center">
									<Skeleton className="rounded-full h-5 w-16" />
									<Skeleton className="h-4 w-32" />
								</div>
								{/* 文本框 */}
								<Skeleton className="rounded-xl h-52 w-full" />
								{/* 字数 + 操作按钮行 */}
								<div className="flex items-center justify-between">
									<Skeleton className="h-4 w-24" />
									<div className="flex gap-2">
										<Skeleton className="rounded-md h-8 w-20" />
										<Skeleton className="rounded-md h-8 w-20" />
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* WriterModelSelector 骨架（右列 3/8） */}
					<div className="lg:col-span-3">
						<div className="border-0 rounded-xl bg-white/80 shadow-lg overflow-hidden backdrop-blur-sm dark:bg-slate-900/80">
							<div className="p-6 pb-3 space-y-1.5">
								<Skeleton className="h-5 w-20" />
								<Skeleton className="h-4 w-36" />
							</div>
							<div className="px-6 pb-6 space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className="p-3 border border-slate-200/60 rounded-xl space-y-1.5 dark:border-slate-700/50"
									>
										<div className="flex items-center justify-between">
											<div className="flex gap-2 items-center">
												<Skeleton className="rounded-full h-4 w-4" />
												<Skeleton className="h-4 w-20" />
											</div>
											<Skeleton className="rounded-full h-5 w-12" />
										</div>
										<Skeleton className="h-3.5 w-full" />
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* WriterAnalysisModes 骨架 */}
				<div className="mb-6">
					<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
						<div className="p-4 flex items-center justify-between">
							<div className="flex gap-2 items-center">
								<Skeleton className="h-5 w-5" />
								<Skeleton className="h-5 w-24" />
								<Skeleton className="rounded-full h-4 w-8" />
							</div>
							<Skeleton className="rounded-md h-8 w-24" />
						</div>
					</div>
				</div>

				{/* 操作按钮行 */}
				<div className="mb-8 flex flex-col gap-4 items-center sm:flex-row sm:justify-center">
					<Skeleton className="rounded-lg h-12 w-full sm:w-40" />
					<Skeleton className="rounded-lg h-12 w-full sm:w-32" />
				</div>

				{/* WriterAnalysisResultPlaceholder 骨架 */}
				<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
					<div className="py-12 flex flex-col gap-4 items-center">
						<Skeleton className="rounded-full h-16 w-16" />
						<Skeleton className="h-5 w-24" />
						<Skeleton className="h-4 w-52" />
					</div>
				</div>
			</div>
		</div>
	);
}

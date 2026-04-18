import { Skeleton } from "@/components/ui/skeleton";

/**
 * 计费管理页面加载骨架屏
 * 在服务器组件渲染期间立即展示，提供流式加载体验
 */
export default function BillingLoading() {
	return (
		<div className="mx-auto max-w-4xl space-y-6">
			{/* 页面标题骨架 */}
			<div className="mb-2 flex gap-3 items-center">
				<Skeleton className="rounded-xl h-10 w-10" />
				<div className="space-y-2">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-4 w-48" />
				</div>
			</div>

			<div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
				{/* BillingManagement 骨架 */}
				<div className="space-y-6">
					{/* 会员/计费总览卡片 */}
					<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
						<div className="p-6 pb-3 space-y-1.5">
							<div className="flex gap-2 items-center">
								<Skeleton className="h-5 w-5" />
								<Skeleton className="h-5 w-20" />
							</div>
							<Skeleton className="h-4 w-44" />
						</div>
						<div className="px-6 pb-6 space-y-5">
							{/* 三列统计数据 */}
							<div className="gap-4 grid grid-cols-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="space-y-2">
										<Skeleton className="h-3.5 w-12" />
										<Skeleton className="h-7 w-16" />
									</div>
								))}
							</div>
							{/* 进度条区域 */}
							<div className="space-y-2">
								<div className="flex justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-16" />
								</div>
								<Skeleton className="rounded-full h-2 w-full" />
							</div>
							{/* 明细列表 */}
							<div className="space-y-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex items-center justify-between">
										<div className="flex gap-2 items-center">
											<Skeleton className="h-4 w-4" />
											<Skeleton className="h-4 w-24" />
										</div>
										<Skeleton className="h-4 w-16" />
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* OrderRedemption 骨架 */}
				<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
					<div className="p-6 pb-3 space-y-1.5">
						<div className="flex gap-2 items-center">
							<Skeleton className="rounded-lg h-9 w-9" />
							<Skeleton className="h-5 w-16" />
						</div>
						<Skeleton className="h-4 w-52" />
					</div>
					<div className="px-6 pb-6 space-y-6">
						<div className="space-y-3">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="rounded-md h-10 w-full" />
						</div>
						<Skeleton className="rounded-md h-10 w-full" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

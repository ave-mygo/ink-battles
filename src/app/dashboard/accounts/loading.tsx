import { Skeleton } from "@/components/ui/skeleton";

/**
 * 账号绑定页面加载骨架屏
 * 在服务器组件渲染期间立即展示，提供流式加载体验
 */
export default function AccountsLoading() {
	return (
		<div className="mx-auto max-w-4xl space-y-6">
			{/* 页面标题骨架 */}
			<div className="mb-2 flex gap-3 items-center">
				<Skeleton className="rounded-xl h-10 w-10" />
				<div className="space-y-2">
					<Skeleton className="h-8 w-24" />
					<Skeleton className="h-4 w-52" />
				</div>
			</div>

			{/* AccountBindings 卡片骨架 */}
			<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				{/* CardHeader */}
				<div className="p-6 pb-3 space-y-1.5">
					<div className="flex gap-2 items-center">
						<Skeleton className="h-5 w-5" />
						<Skeleton className="h-5 w-20" />
					</div>
					<Skeleton className="h-4 w-48" />
				</div>

				{/* CardContent - 三个绑定项 */}
				<div className="px-6 pb-6 space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="p-4 border border-slate-200/40 rounded-xl flex items-center justify-between dark:border-slate-700/50"
						>
							<div className="flex gap-3 items-center">
								{/* 图标 */}
								<Skeleton className="rounded-lg h-10 w-10" />
								<div className="space-y-1.5">
									<div className="flex gap-2 items-center">
										<Skeleton className="h-4 w-16" />
										<Skeleton className="rounded-full h-5 w-14" />
									</div>
									<Skeleton className="h-3.5 w-28" />
								</div>
							</div>
							{/* 操作按钮 */}
							<Skeleton className="rounded-md h-9 w-16" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

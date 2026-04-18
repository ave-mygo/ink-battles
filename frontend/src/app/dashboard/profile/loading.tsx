import { Skeleton } from "@/components/ui/skeleton";

/**
 * 用户信息页面加载骨架屏
 * 在服务器组件渲染期间立即展示，提供流式加载体验
 */
export default function ProfileLoading() {
	return (
		<div className="mx-auto max-w-4xl space-y-6">
			{/* 页面标题骨架 */}
			<div className="mb-2 flex gap-3 items-center">
				<Skeleton className="rounded-xl h-10 w-10" />
				<div className="space-y-2">
					<Skeleton className="h-8 w-28" />
					<Skeleton className="h-4 w-44" />
				</div>
			</div>

			{/* ProfileHeader 骨架 */}
			<div className="p-6 border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				<div className="flex flex-col gap-4 items-center sm:flex-row sm:gap-6 sm:items-start">
					{/* 头像 */}
					<Skeleton className="rounded-full shrink-0 h-24 w-24" />
					{/* 昵称 + 签名 */}
					<div className="flex flex-1 flex-col gap-3 w-full items-center sm:items-start">
						<Skeleton className="h-8 w-40" />
						<Skeleton className="h-5 w-64" />
					</div>
				</div>
			</div>

			{/* 两列卡片骨架 */}
			<div className="gap-6 grid md:grid-cols-2">
				{/* BasicInfoCard 骨架 */}
				<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
					<div className="p-6 pb-3 space-y-1.5">
						<div className="flex gap-2 items-center">
							<Skeleton className="h-5 w-5" />
							<Skeleton className="h-5 w-16" />
						</div>
						<Skeleton className="h-4 w-28" />
					</div>
					<div className="px-6 pb-6 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="p-4 border border-slate-200/40 rounded-xl flex items-center justify-between dark:border-slate-700/50"
							>
								<div className="flex gap-3 items-center">
									<Skeleton className="h-5 w-5" />
									<div className="space-y-1.5">
										<Skeleton className="h-4 w-16" />
										<Skeleton className="h-3.5 w-24" />
									</div>
								</div>
								<Skeleton className="h-5 w-20" />
							</div>
						))}
					</div>
				</div>

				{/* AccountStatusCard 骨架 */}
				<div className="border-0 rounded-xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
					<div className="p-6 pb-3 space-y-1.5">
						<div className="flex gap-2 items-center">
							<Skeleton className="h-5 w-5" />
							<Skeleton className="h-5 w-16" />
						</div>
						<Skeleton className="h-4 w-28" />
					</div>
					<div className="px-6 pb-6 space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="p-4 border border-slate-200/40 rounded-xl flex items-center justify-between dark:border-slate-700/50"
							>
								<div className="space-y-1.5">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-3.5 w-24" />
								</div>
								<Skeleton className="h-5 w-24" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * 赞助页面加载骨架屏
 * SponsorHeader（静态标题）+ SponsorList（赞助者卡片网格）
 */
export default function SponsorsLoading() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				{/* SponsorHeader 骨架 */}
				<div className="mb-8 text-center">
					<div className="mb-6 flex gap-4 items-center justify-center">
						<Skeleton className="rounded-2xl h-16 w-16" />
						<Skeleton className="h-12 w-48" />
					</div>
					{/* CTA 卡片 */}
					<div className="mb-8 p-8 rounded-2xl bg-white/80 shadow-lg dark:bg-slate-800/60">
						<Skeleton className="mx-auto mb-6 h-7 max-w-lg w-3/4" />
						<div className="flex flex-wrap gap-4 justify-center">
							<Skeleton className="rounded-full h-12 w-36" />
							<Skeleton className="rounded-full h-12 w-28" />
						</div>
					</div>
				</div>

				{/* SponsorList 骨架 */}
				<div className="space-y-8">
					<div className="gap-8 grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
						{Array.from({ length: 9 }).map((_, i) => (
							<div
								key={i}
								className="border-2 border-slate-100 rounded-xl overflow-hidden dark:border-slate-800"
							>
								<div className="p-6 flex flex-col gap-3 items-center">
									<Skeleton className="rounded-full h-20 w-20" />
									<Skeleton className="h-6 w-32" />
									<div className="flex gap-2">
										<Skeleton className="rounded-full h-6 w-20" />
										<Skeleton className="rounded-full h-6 w-16" />
									</div>
									<Skeleton className="h-4 w-24" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

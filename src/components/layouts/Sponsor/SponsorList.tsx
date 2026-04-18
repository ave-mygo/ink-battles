"use client";

import type { SponsorData } from "@/types/common/sponsor";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClientEden } from "@/utils/api/eden-client";
import { unwrapEdenPayload } from "@/utils/api/eden-response";

function SponsorCardSkeleton() {
	return (
		<Card className="border-2 border-slate-100 overflow-hidden dark:border-slate-800">
			<div className="p-6 flex flex-col gap-3 items-center">
				<Skeleton className="rounded-full h-20 w-20" />
				<Skeleton className="h-6 w-32" />
				<div className="flex gap-2">
					<Skeleton className="rounded-full h-6 w-20" />
					<Skeleton className="rounded-full h-6 w-16" />
				</div>
				<Skeleton className="h-4 w-24" />
			</div>
		</Card>
	);
}

function SponsorLoadingSkeleton() {
	return (
		<div className="space-y-8">
			<div className="gap-8 grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
				{Array.from({ length: 9 }).map((_, i) => (
					<SponsorCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
}

export default function SponsorList() {
	const [data, setData] = useState<SponsorData | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [initialLoading, setInitialLoading] = useState(true);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const response = await createClientEden().api.v2.sponsors.get({
					query: { page: 1 },
				});
				const newData = await unwrapEdenPayload<SponsorData>(response.data, response.error, { data: { list: [], total_page: 0 } });
				setData(newData);
				setCurrentPage(1);
			} catch (error) {
				console.error("Failed to fetch sponsors:", error);
			} finally {
				setInitialLoading(false);
			}
		};
		fetchData();
	}, []);

	const loadMoreData = async () => {
		if (!data || loading)
			return;

		setLoading(true);
		try {
			const nextPage = currentPage + 1;
			const response = await createClientEden().api.v2.sponsors.get({
				query: { page: nextPage },
			});
			const newData = await unwrapEdenPayload<SponsorData>(response.data, response.error, { data: { list: [], total_page: 0 } });

			setData(prev => prev && newData
				? {
						data: {
							...prev.data,
							list: [...prev.data.list, ...newData.data.list],
						},
					}
				: newData);
			setCurrentPage(nextPage);
		} catch (error) {
			console.error("Failed to load more sponsors:", error);
		} finally {
			setLoading(false);
		}
	};

	// 自动加载：滚动至底部哨兵时触发加载更多
	useEffect(() => {
		if (initialLoading)
			return;
		const total = data?.data.total_page ?? 0;
		if (!sentinelRef.current || !data || currentPage >= total)
			return;

		const el = sentinelRef.current;
		let ticking = false;
		let timer: ReturnType<typeof setTimeout> | null = null;
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry.isIntersecting)
					return;
				if (ticking || loading)
					return;
				ticking = true;
				// 小延迟避免连续触发
				timer = setTimeout(() => {
					loadMoreData().finally(() => {
						ticking = false;
					});
				}, 100);
			},
			{ root: null, rootMargin: "200px 0px", threshold: 0.1 },
		);
		observer.observe(el);
		return () => {
			if (timer)
				clearTimeout(timer);
			observer.disconnect();
		};
	}, [data, currentPage, loading, initialLoading]);

	// 如果还在初始加载，显示骨架屏
	if (initialLoading) {
		return <SponsorLoadingSkeleton />;
	}

	// 如果没有数据，显示空状态
	if (!data || !data.data.list.length) {
		return (
			<div className="py-16 text-center">
				<div className="text-6xl mb-4">💝</div>
				<h3 className="text-xl text-slate-700 font-semibold mb-2 dark:text-slate-200">暂无赞助者</h3>
				<p className="text-slate-500 dark:text-slate-400">成为第一个赞助者，支持我们的项目发展！</p>
			</div>
		);
	}

	// 找到累计最多和最新的赞助者
	const mostSponsor = data.data.list.reduce((max, cur) =>
		Number.parseFloat(cur.all_sum_amount) > Number.parseFloat(max.all_sum_amount) ? cur : max, data.data.list[0]);
	const latestSponsor = data.data.list.reduce((latest, cur) =>
		cur.last_pay_time > latest.last_pay_time ? cur : latest, data.data.list[0]);

	return (
		<div className="space-y-8">
			<div className="gap-8 grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
				{data.data.list.map((sponsor) => {
					const isMost = sponsor.user.user_id === mostSponsor?.user.user_id;
					const isLatest = sponsor.user.user_id === latestSponsor?.user.user_id;
					return (
						<Card
							key={sponsor.user.user_id}
							className={`border-2 transition-all duration-300 overflow-hidden hover:shadow-xl hover:-translate-y-1 ${
								isMost
									? "border-yellow-400 bg-linear-to-br from-yellow-50 to-orange-50 dark:border-yellow-700 dark:from-yellow-900/20 dark:to-orange-900/10"
									: isLatest
										? "border-blue-400 bg-linear-to-br from-blue-50 to-cyan-50 dark:border-blue-700 dark:from-blue-900/20 dark:to-cyan-900/10"
										: "border-slate-100 hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700"
							}`}
						>
							<div className="p-6 flex flex-col gap-4 items-center">
								<div className="relative">
									<img
										src={sponsor.user.avatar}
										alt={sponsor.user.name}
										className="border-4 border-white rounded-full h-20 w-20 shadow-lg object-cover dark:border-slate-700"
										loading="lazy"
									/>
									{isMost && (
										<span className="text-xs text-white font-bold px-2 py-1 rounded-full shadow-md absolute from-yellow-400 to-orange-400 bg-linear-to-r -right-2 -top-2">
											💎 累计最多
										</span>
									)}
									{isLatest && !isMost && (
										<span className="text-xs text-white font-bold px-2 py-1 rounded-full shadow-md absolute from-blue-400 to-cyan-400 bg-linear-to-r -right-2 -top-2">
											⭐ 最新赞助
										</span>
									)}
								</div>
								<div className="text-center">
									<h3 className="text-lg text-slate-900 font-bold mb-1 max-w-full truncate dark:text-slate-100">
										{sponsor.user.name}
									</h3>
								</div>
								<div className="flex flex-wrap gap-2 w-full items-center justify-center">
									<span className="text-sm text-amber-800 font-semibold px-3 py-1.5 border border-amber-200 rounded-full from-amber-100 to-yellow-100 bg-linear-to-r dark:text-amber-200 dark:border-amber-800 dark:from-amber-900/30 dark:to-yellow-900/20">
										💰 ¥
										{sponsor.all_sum_amount}
									</span>
									{sponsor.current_plan.name && (
										<span className="text-sm text-blue-800 font-semibold px-3 py-1.5 border border-blue-200 rounded-full from-blue-100 to-cyan-100 bg-linear-to-r dark:text-blue-200 dark:border-blue-800 dark:from-blue-900/30 dark:to-cyan-900/20">
											🎯
											{" "}
											{sponsor.current_plan.name}
										</span>
									)}
								</div>
								<div className="text-xs text-slate-500 px-3 py-1 rounded-full bg-slate-50 dark:text-slate-400 dark:bg-slate-800/60">
									🕒
									{" "}
									{new Date(sponsor.last_pay_time * 1000).toLocaleDateString("zh-CN")}
								</div>
							</div>
						</Card>
					);
				})}
			</div>

			{/* 滚动哨兵：可见即自动加载 */}
			<div ref={sentinelRef} className="h-1" />

			{/* 加载更多按钮（兜底） */}
			{currentPage < data.data.total_page && (
				<div className="py-6 text-center">
					<Button
						onClick={loadMoreData}
						disabled={loading}
						variant="outline"
						size="lg"
						className="text-base border-2 rounded-full min-w-50 dark:border-slate-700 hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-slate-800/60"
					>
						{loading
							? (
									<>
										<div className="mr-2 border-2 border-pink-300 border-t-transparent rounded-full h-4 w-4 animate-spin" />
										加载中...
									</>
								)
							: (
									<>
										<span className="mr-2">📄</span>
										加载更多赞助者
									</>
								)}
					</Button>
				</div>
			)}
		</div>
	);
}

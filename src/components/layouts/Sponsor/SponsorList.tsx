"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Sponsor {
	user: {
		user_id: string;
		name: string;
		avatar: string;
	};
	all_sum_amount: string;
	last_pay_time: number;
	current_plan: {
		name: string;
	};
}

interface SponsorData {
	data: {
		list: Sponsor[];
		total_page: number;
	};
}

function LoadingModal({ open }: { open: boolean }) {
	if (!open)
		return null;
	return (
		<div className="bg-black/40 flex items-center inset-0 justify-center fixed z-50">
			<div className="px-8 py-8 rounded-2xl bg-white flex flex-col gap-4 min-w-[220px] shadow-2xl items-center animate-fade-in">
				<svg className="text-pink-500 h-10 w-10 animate-spin" viewBox="0 0 24 24">
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
					<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
				</svg>
				<div className="text-lg text-slate-700 font-medium">正在加载赞助者...</div>
			</div>
		</div>
	);
}

export default function SponsorList() {
	const [data, setData] = useState<SponsorData | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		// 首次挂载时拉取第一页
		const fetchData = async () => {
			setLoading(true);
			try {
				const response = await fetch(`/api/sponsors?page=1`);
				const newData: SponsorData = await response.json();
				setData(newData);
				setCurrentPage(1);
			} catch (error) {
				console.error("Failed to fetch sponsors:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	const loadMoreData = async () => {
		setLoading(true);
		try {
			const nextPage = currentPage + 1;
			const response = await fetch(`/api/sponsors?page=${nextPage}`);
			const newData: SponsorData = await response.json();
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

	// 找到累计最多和最新的赞助者
	const mostSponsor = data?.data.list.reduce((max, cur) => Number.parseFloat(cur.all_sum_amount) > Number.parseFloat(max.all_sum_amount) ? cur : max, data.data.list[0]);
	const latestSponsor = data?.data.list.reduce((latest, cur) => cur.last_pay_time > latest.last_pay_time ? cur : latest, data.data.list[0]);

	return (
		<>
			<LoadingModal open={loading || !data} />
			<div className="space-y-8" style={{ filter: loading || !data ? "blur(2px)" : undefined, pointerEvents: loading || !data ? "none" : undefined }}>
				<div className="gap-8 grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
					{data?.data.list.map((sponsor) => {
						const isMost = sponsor.user.user_id === mostSponsor?.user.user_id;
						const isLatest = sponsor.user.user_id === latestSponsor?.user.user_id;
						return (
							<Card
								key={sponsor.user.user_id}
								className={`overflow-hidden transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 border-2 ${isMost ? "border-yellow-400" : isLatest ? "border-blue-400" : "border-slate-100"}`}
							>
								<div className="p-6 flex flex-col gap-3 items-center">
									<div className="relative">
										<img
											src={sponsor.user.avatar}
											alt={sponsor.user.name}
											className="border-4 border-white rounded-full h-20 w-20 shadow-md object-cover"
											loading="lazy"
										/>
										{isMost && <span className="text-xs text-white font-bold px-2 py-0.5 rounded-full bg-yellow-400 shadow absolute -right-2 -top-2">累计最多</span>}
										{isLatest && !isMost && <span className="text-xs text-white font-bold px-2 py-0.5 rounded-full bg-blue-400 shadow absolute -right-2 -top-2">最新赞助</span>}
									</div>
									<h3 className="text-xl text-slate-900 font-bold text-center w-full truncate">{sponsor.user.name}</h3>
									<div className="flex flex-wrap gap-2 w-full items-center justify-center">
										<span className="text-sm text-yellow-800 font-semibold px-3 py-1 rounded-full bg-yellow-100">
											累计 ¥
											{sponsor.all_sum_amount}
										</span>
										{sponsor.current_plan.name && (
											<span className="text-sm text-blue-700 font-semibold px-3 py-1 rounded-full bg-blue-100">{sponsor.current_plan.name}</span>
										)}
									</div>
									<div className="text-xs text-slate-500 mt-2">
										最后赞助：
										{new Date(sponsor.last_pay_time * 1000).toLocaleDateString("zh-CN")}
									</div>
								</div>
							</Card>
						);
					})}
				</div>
				{data && currentPage < data.data.total_page && (
					<div className="py-4 text-center">
						<Button
							onClick={loadMoreData}
							disabled={loading}
							variant="outline"
							size="lg"
							className="text-lg rounded-full min-w-[200px]"
						>
							{loading ? <span className="animate-pulse">加载中...</span> : "加载更多赞助者"}
						</Button>
					</div>
				)}
			</div>
		</>
	);
}

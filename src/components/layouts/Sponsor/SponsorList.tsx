"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

interface SponsorListProps {
	initialData: SponsorData;
}

export default function SponsorList({ initialData }: SponsorListProps) {
	const [data, setData] = useState<SponsorData>(initialData);
	const [currentPage, setCurrentPage] = useState(1);
	const [loading, setLoading] = useState(false);

	const loadMoreData = async () => {
		setLoading(true);
		try {
			const nextPage = currentPage + 1;
			const response = await fetch(`/api/sponsors?page=${nextPage}`);
			const newData: SponsorData = await response.json();

			setData(prev => ({
				data: {
					...prev.data,
					list: [...prev.data.list, ...newData.data.list],
				},
			}));
			setCurrentPage(nextPage);
		} catch (error) {
			console.error("Failed to load more sponsors:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-8">
			<div className="gap-6 grid lg:grid-cols-3 md:grid-cols-2">
				{data.data.list.map(sponsor => (
					<Card key={sponsor.user.user_id} className="overflow-hidden">
						<div className="p-6">
							<div className="flex items-center space-x-4">
								<div className="flex-shrink-0">
									<img
										src={sponsor.user.avatar}
										alt={sponsor.user.name}
										className="rounded-full h-12 w-12 object-cover"
										loading="lazy"
									/>
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="text-slate-900 font-medium truncate">
										{sponsor.user.name}
									</h3>
									<p className="text-sm text-slate-500">
										累计赞助: ¥
										{sponsor.all_sum_amount}
									</p>
								</div>
							</div>

							<Separator className="my-4" />

							<div className="text-sm text-slate-600 space-y-2">
								<div className="flex items-center justify-between">
									<span>最后赞助:</span>
									<span>{new Date(sponsor.last_pay_time * 1000).toLocaleDateString("zh-CN")}</span>
								</div>
								{sponsor.current_plan.name && (
									<div className="flex items-center justify-between">
										<span>当前方案:</span>
										<span className="text-blue-600">{sponsor.current_plan.name}</span>
									</div>
								)}
							</div>
						</div>
					</Card>
				))}
			</div>

			{currentPage < data.data.total_page && (
				<div className="py-4 text-center">
					<Button
						onClick={loadMoreData}
						disabled={loading}
						variant="outline"
						size="lg"
						className="min-w-[200px]"
					>
						{loading ? "加载中..." : "加载更多赞助者"}
					</Button>
				</div>
			)}
		</div>
	);
}

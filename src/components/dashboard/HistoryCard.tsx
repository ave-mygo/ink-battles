"use client";

import { Calendar, ChevronRight, FileText, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalysisHistoryItem {
	_id: string;
	timestamp: string;
	overallScore: number;
	title: string;
	ratingTag: string;
	summary: string;
	mode: string;
}

interface AnalysisHistoryResponse {
	data: AnalysisHistoryItem[];
	total: number;
}

interface HistoryCardProps {
	initialData?: AnalysisHistoryItem[];
}

export function HistoryCard({ initialData }: HistoryCardProps) {
	const [historyData, setHistoryData] = useState<AnalysisHistoryResponse | null>(
		initialData ? { data: initialData, total: initialData.length } : null,
	);
	const [loading, setLoading] = useState(!initialData);

	useEffect(() => {
		if (initialData) {
			return;
		}

		const fetchRecentHistory = async () => {
			try {
				setLoading(true);
				const response = await fetch("/api/user/analysis-history?page=1&limit=3");
				const data = await response.json();

				if (response.ok) {
					setHistoryData(data);
				}
			} catch (error) {
				console.error("获取最近历史记录失败:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchRecentHistory();
	}, [initialData]);

	const formatDate = (timestamp: string) => {
		return new Date(timestamp).toLocaleDateString("zh-CN", {
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getScoreColor = (score: number) => {
		if (score >= 80)
			return "text-green-600";
		if (score >= 60)
			return "text-yellow-600";
		if (score >= 40)
			return "text-orange-600";
		return "text-red-600";
	};

	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<Calendar className="text-blue-600 h-5 w-5" />
					最近分析
				</CardTitle>
			</CardHeader>
			<CardContent>
				{loading
					? (
							<div className="space-y-3">
								{Array.from({ length: 3 }).map((_, index) => (
									<div key={index} className="flex gap-3 items-center">
										<Skeleton className="rounded-full h-10 w-10" />
										<div className="flex-1 space-y-1">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
								))}
							</div>
						)
					: historyData?.data.length === 0
						? (
								<div className="py-8 text-center">
									<FileText className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
									<p className="text-muted-foreground text-sm">暂无分析记录</p>
								</div>
							)
						: (
								<div className="space-y-3">
									{historyData?.data.map(item => (
										<Link
											key={item._id}
											href={`/history/${item._id}`}
											className="block"
										>
											<div className="hover:bg-muted/50 group p-2 rounded-lg flex gap-3 transition-colors items-center">
												<div className="bg-primary/10 rounded-full flex shrink-0 h-10 w-10 items-center justify-center">
													<Star className={`h-4 w-4 ${getScoreColor(item.overallScore)}`} />
												</div>
												<div className="flex-1 min-w-0">
													<p className="group-hover:text-primary text-sm font-medium truncate transition-colors">{item.title}</p>
													<div className="flex gap-2 items-center">
														<span className={`text-xs font-medium ${getScoreColor(item.overallScore)}`}>
															{item.overallScore}
															分
														</span>
														<span className="text-muted-foreground text-xs">
															{formatDate(item.timestamp)}
														</span>
														{item.mode && (
															<span className="bg-secondary text-xs px-1.5 py-0.5 rounded-full">
																{item.mode.split(",")[0]}
															</span>
														)}
													</div>
												</div>
												<ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors" />
											</div>
										</Link>
									))}
								</div>
							)}
				<div className="mt-4 pt-3 border-t">
					<Button asChild variant="outline" size="sm" className="border-2 bg-white w-full hover:bg-gray-50">
						<Link href="/history" className="flex gap-2 items-center">
							查看全部历史
							<ChevronRight className="h-4 w-4" />
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

"use client";

import type { AnalysisHistoryResponse } from "@/lib/analysis-history";
import type { UserSubscriptionData } from "@/lib/subscription";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, LayoutGrid, List, Star, TrendingUp } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryClientProps {
	_initialData: UserSubscriptionData; // Prefixed with _ to indicate intentionally unused for now
	initialHistory?: AnalysisHistoryResponse;
}

export const HistoryClient = ({ _initialData, initialHistory }: HistoryClientProps) => {
	const [historyData, setHistoryData] = useState<AnalysisHistoryResponse | null>(initialHistory || null);
	const [loading, setLoading] = useState(!initialHistory);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize] = useState(10);
	const [view, setView] = useState<"grid" | "list">("list");

	// derived pagination info
	const totalPages = useMemo(() => {
		const total = historyData?.total ?? 0;
		const limit = historyData?.limit ?? pageSize;
		return Math.max(1, Math.ceil(total / Math.max(1, limit)));
	}, [historyData, pageSize]);

	// UI controls
	const [query, setQuery] = useState("");
	const [modeFilter, setModeFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<"time_desc" | "time_asc" | "score_desc" | "score_asc">("time_desc");

	const fetchHistory = useCallback(async (page: number, limit: number) => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch(`/api/user/analysis-history?page=${page}&limit=${limit}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "获取历史记录失败");
			}

			setHistoryData(data);
		} catch (error) {
			console.error("获取历史记录失败:", error);
			setError(error instanceof Error ? error.message : "获取历史记录失败");
			toast.error("获取历史记录失败");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchHistory(currentPage, pageSize);
	}, [fetchHistory, currentPage, pageSize]);

	const formatDate = useCallback((timestamp: string) => {
		return new Date(timestamp).toLocaleString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	}, []);

	const getScoreBg = useCallback((score: number) => {
		if (score >= 80)
			return "bg-green-100";
		if (score >= 60)
			return "bg-yellow-100";
		if (score >= 40)
			return "bg-orange-100";
		return "bg-red-100";
	}, []);

	const getScoreText = useCallback((score: number) => {
		if (score >= 80)
			return "text-green-800";
		if (score >= 60)
			return "text-yellow-800";
		if (score >= 40)
			return "text-orange-800";
		return "text-red-800";
	}, []);

	// client-side filter & sort within current page - 使用useMemo优化性能
	const displayedItems = useMemo(() => {
		const items = historyData?.data ?? [];
		
		// 避免重复计算
		const queryLower = query.trim().toLowerCase();
		const hasQuery = queryLower.length > 0;
		
		const filtered = items.filter((it) => {
			const hitQuery = hasQuery
				? [it.title, it.ratingTag, it.summary, ...(it.tags || [])].some(t => 
					t && typeof t === 'string' && t.toLowerCase().includes(queryLower))
				: true;
			const hitMode = modeFilter === "all" ? true : (it.mode || "默认模式").split(",").some(mode => mode.trim() === modeFilter);
			return hitQuery && hitMode;
		});

		// 优化排序，减少不必要的Date对象创建
		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "time_asc":
					return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
				case "score_desc":
					return b.overallScore - a.overallScore;
				case "score_asc":
					return a.overallScore - b.overallScore;
				case "time_desc":
				default:
					return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
			}
		});

		return sorted;
	}, [historyData?.data, query, modeFilter, sortBy]); // 更精确的依赖项

	if (error) {
		return (
			<div className="mx-auto p-6 container max-w-6xl">
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
				<div className="mt-4 text-center">
					<Button onClick={() => fetchHistory(currentPage, pageSize)}>重试</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto p-6 container max-w-6xl">
			{/* Header Section with Search & Controls */}
			<div className="mb-8">
				<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-3xl tracking-tight font-bold">分析历史</h1>
						<p className="text-muted-foreground">查看和管理您的文本分析记录</p>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setView(view === "list" ? "grid" : "list")}
							className="border-2 bg-white hover:bg-gray-50"
						>
							{view === "grid" ? <List className="mr-2 h-4 w-4" /> : <LayoutGrid className="mr-2 h-4 w-4" />}
							{view === "grid" ? "列表视图" : "网格视图"}
						</Button>
					</div>
				</div>

				{/* Filters & Search Bar */}
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
					<CardContent className="p-4">
						<div className="gap-4 grid md:grid-cols-4">
							<div className="space-y-2">
								<Label htmlFor="search" className="text-sm font-medium">搜索内容</Label>
								<Input
									id="search"
									placeholder="搜索标题、标签或摘要..."
									value={query}
									onChange={e => setQuery(e.target.value)}
									className="h-9"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="mode" className="text-sm font-medium">分析模式</Label>
								<Select value={modeFilter} onValueChange={setModeFilter}>
									<SelectTrigger id="mode" className="h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">全部模式</SelectItem>
										<SelectItem value="初窥门径">初窥门径</SelectItem>
										<SelectItem value="严苛编辑">严苛编辑</SelectItem>
										<SelectItem value="宽容读者">宽容读者</SelectItem>
										<SelectItem value="文本法官">文本法官</SelectItem>
										<SelectItem value="热血粉丝">热血粉丝</SelectItem>
										<SelectItem value="反现代主义者">反现代主义者</SelectItem>
										<SelectItem value="速写视角">速写视角</SelectItem>
										<SelectItem value="碎片主义护法">碎片主义护法</SelectItem>
										<SelectItem value="AI鉴别师">AI鉴别师</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="sort" className="text-sm font-medium">排序方式</Label>
								<Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
									<SelectTrigger id="sort" className="h-9">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="time_desc">最新优先</SelectItem>
										<SelectItem value="time_asc">最早优先</SelectItem>
										<SelectItem value="score_desc">高分优先</SelectItem>
										<SelectItem value="score_asc">低分优先</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-end">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setQuery("");
										setModeFilter("all");
										setSortBy("time_desc");
									}}
									className="border-2 bg-white h-9 w-full hover:bg-gray-50"
								>
									重置筛选
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Stats Overview */}
			{historyData && (
				<div className="mb-6 gap-4 grid md:grid-cols-3">
					<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
						<CardContent className="p-4">
							<div className="flex gap-3 items-center">
								<div className="rounded-full bg-blue-100 flex h-10 w-10 items-center justify-center">
									<FileText className="text-blue-600 h-5 w-5" />
								</div>
								<div>
									<p className="text-2xl font-bold">{historyData.total}</p>
									<p className="text-muted-foreground text-sm">总分析次数</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
						<CardContent className="p-4">
							<div className="flex gap-3 items-center">
								<div className="rounded-full bg-green-100 flex h-10 w-10 items-center justify-center">
									<TrendingUp className="text-green-600 h-5 w-5" />
								</div>
								<div>
									<p className="text-2xl font-bold">
										{historyData.data.length > 0
											? Math.round(historyData.data.reduce((sum, item) => sum + item.overallScore, 0) / historyData.data.length)
											: 0}
									</p>
									<p className="text-muted-foreground text-sm">平均得分</p>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
						<CardContent className="p-4">
							<div className="flex gap-3 items-center">
								<div className="rounded-full bg-purple-100 flex h-10 w-10 items-center justify-center">
									<CalendarDays className="text-purple-600 h-5 w-5" />
								</div>
								<div>
									<p className="text-2xl font-bold">{displayedItems.length}</p>
									<p className="text-muted-foreground text-sm">当前显示</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Loading State */}
			{loading && (
				<div className="space-y-4">
					{Array.from({ length: 6 }).map((_, index) => (
						<Card key={index} className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
							<CardContent className="p-6">
								<div className="flex gap-4 items-start">
									<Skeleton className="rounded-full h-12 w-12" />
									<div className="flex-1 space-y-3">
										<Skeleton className="h-5 w-3/4" />
										<Skeleton className="h-4 w-1/2" />
										<div className="flex gap-2">
											<Skeleton className="h-6 w-16" />
											<Skeleton className="h-6 w-20" />
										</div>
									</div>
									<Skeleton className="h-8 w-20" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Empty State */}
			{!loading && displayedItems.length === 0 && (
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
					<CardContent className="py-12 text-center">
						<FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
						<h3 className="text-lg font-semibold mb-2">暂无分析记录</h3>
						<p className="text-muted-foreground mb-4">开始您的第一次文本分析吧</p>
						<Button asChild>
							<Link href="/writer" className="bg-primary hover:bg-primary/90 text-primary-foreground">开始分析</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			{/* History Items */}
			{!loading && displayedItems.length > 0 && (
				<div className={view === "grid" ? "gap-4 grid md:grid-cols-2" : "space-y-4"}>
					{displayedItems.map(item => (
						<Card key={item._id} className="group border-0 bg-white/80 shadow-lg transition-all duration-200 backdrop-blur-sm hover:shadow-xl">
							<CardContent className="p-6">
								<div className="flex gap-4 items-start">
									{/* Score Badge */}
									<div className={`rounded-full flex shrink-0 h-12 w-12 items-center justify-center ${getScoreBg(item.overallScore)}`}>
										<Star className={`h-5 w-5 ${getScoreText(item.overallScore)}`} />
									</div>

									{/* Content */}
									<div className="flex-1 min-w-0">
										<h3 className="group-hover:text-primary text-lg font-semibold mb-2 transition-colors line-clamp-2">
											{item.title}
										</h3>
										<p className="text-muted-foreground text-sm mb-3 line-clamp-2">
											{item.summary}
										</p>

										{/* Meta Information */}
										<div className="flex flex-wrap gap-2 items-center">
											<Badge variant="secondary" className="text-xs">
												{item.mode || "默认模式"}
											</Badge>
											<Badge
												variant="outline"
												className={`text-xs ${getScoreText(item.overallScore)}`}
											>
												{item.overallScore}
												分 ·
												{item.ratingTag}
											</Badge>
											<span className="text-muted-foreground text-xs">
												{formatDate(item.timestamp)}
											</span>
										</div>

										{/* Tags */}
										{item.tags && item.tags.length > 0 && (
											<div className="mt-2 flex flex-wrap gap-1">
												{item.tags.slice(0, 4).map((tag, index) => (
													<Badge
														key={index}
														variant="outline"
														className="text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
													>
														{tag}
													</Badge>
												))}
												{item.tags.length > 4 && (
													<Badge
														variant="outline"
														className="text-xs text-gray-600 border-gray-200 bg-gray-50"
													>
														+
														{item.tags.length - 4}
													</Badge>
												)}
											</div>
										)}
									</div>

									{/* Action Button */}
									<Button asChild variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0">
										<Link href={`/history/${item._id}`}>
											查看详情
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Pagination */}
			{!loading && historyData && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<div className="flex gap-2 items-center">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
							disabled={currentPage <= 1}
							className="border-2 bg-white hover:bg-gray-50"
						>
							<ChevronLeft className="h-4 w-4" />
							上一页
						</Button>

						<div className="flex gap-1 items-center">
							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const pageNum = currentPage <= 3
									? i + 1
									: currentPage >= totalPages - 2
										? totalPages - 4 + i
										: currentPage - 2 + i;

								if (pageNum < 1 || pageNum > totalPages)
									return null;

								return (
									<Button
										key={pageNum}
										variant={pageNum === currentPage ? "default" : "outline"}
										size="sm"
										onClick={() => setCurrentPage(pageNum)}
										className={`p-0 h-8 w-8 ${pageNum === currentPage
											? "bg-primary hover:bg-primary/90 text-primary-foreground"
											: "border-2 bg-white hover:bg-gray-50"
										}`}
									>
										{pageNum}
									</Button>
								);
							})}
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
							disabled={currentPage >= totalPages}
							className="border-2 bg-white hover:bg-gray-50"
						>
							下一页
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};

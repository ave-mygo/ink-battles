"use client";

import type { DatabaseAnalysisRecord } from "@/types/database/analysis_requests";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteAnalysisRecord, getUserAnalysisHistory, toggleRecordPublic } from "@/utils/dashboard";
import { HistoryCard } from "./HistoryCard";

interface HistoryListProps {
	initialData?: {
		records: DatabaseAnalysisRecord[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

/**
 * 历史记录卡片骨架屏组件
 * 在分页加载期间展示
 */
function HistoryCardSkeleton() {
	return (
		<div className="border-0 rounded-xl bg-white/80 flex flex-col shadow-lg overflow-hidden backdrop-blur-sm dark:bg-slate-900/80">
			<div className="p-6 pb-3 space-y-3">
				<div className="flex gap-4 items-start justify-between">
					<div className="space-y-2">
						<div className="flex gap-2">
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-14" />
						</div>
						<div className="flex gap-3">
							<Skeleton className="h-3.5 w-20" />
							<Skeleton className="h-3.5 w-24" />
						</div>
					</div>
					<div className="flex flex-col items-end">
						<Skeleton className="h-8 w-12" />
						<Skeleton className="mt-1 h-3 w-8" />
					</div>
				</div>
			</div>
			<div className="px-6 pb-3 flex-1 space-y-3">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-4/5" />
				<Skeleton className="h-4 w-3/5" />
				<div className="pt-1 flex gap-1.5">
					<Skeleton className="h-5 w-12" />
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-5 w-10" />
				</div>
			</div>
			<div className="px-6 py-3 border-t border-slate-100/50 flex items-center justify-between dark:border-slate-700/30">
				<div className="flex gap-2">
					<Skeleton className="h-8 w-20" />
					<Skeleton className="h-8 w-8" />
				</div>
				<Skeleton className="h-8 w-24" />
			</div>
		</div>
	);
}

/**
 * 历史记录列表组件
 * 支持分页、公开状态切换和删除，带骨架屏加载状态
 */
export function HistoryList({ initialData }: HistoryListProps) {
	const [data, setData] = useState(initialData);
	const [isLoading, setIsLoading] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);

	/** 切换记录公开状态 */
	const handleTogglePublic = useCallback(async (recordId: string, isPublic: boolean) => {
		const result = await toggleRecordPublic(recordId, isPublic);
		if (!result.success) {
			throw new Error(result.message || "操作失败");
		}

		setData((prev) => {
			if (!prev)
				return prev;
			return {
				...prev,
				records: prev.records.map(record =>
					record._id === recordId
						? { ...record, settings: { ...record.settings, public: isPublic } }
						: record,
				),
			};
		});
	}, []);

	/** 删除分析记录 */
	const handleDelete = useCallback(async (recordId: string) => {
		const result = await deleteAnalysisRecord(recordId);
		if (!result.success) {
			throw new Error(result.message || "删除失败");
		}

		setData((prev) => {
			if (!prev)
				return prev;
			const newRecords = prev.records.filter(record => record._id !== recordId);
			const newTotal = prev.total - 1;
			const newTotalPages = Math.ceil(newTotal / prev.limit);

			// 若当前页已无记录且不是第一页，自动跳转到上一页
			if (newRecords.length === 0 && prev.page > 1) {
				loadPage(prev.page - 1);
				return prev;
			}

			return {
				...prev,
				records: newRecords,
				total: newTotal,
				totalPages: newTotalPages,
			};
		});
	}, []);

	/** 加载指定页码的数据 */
	const loadPage = useCallback(async (newPage: number) => {
		if (!data)
			return;
		setIsLoading(true);

		// 滚动到列表顶部
		listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

		try {
			const result = await getUserAnalysisHistory(newPage, data.limit);
			if (result.success && result.data) {
				setData(result.data);
			} else {
				toast.error("加载失败", {
					description: result.message || "无法加载历史记录，请稍后重试",
				});
			}
		} catch (error) {
			console.error("加载页面失败:", error);
			toast.error("加载失败", {
				description: "网络请求出错，请检查网络连接后重试",
			});
		} finally {
			setIsLoading(false);
		}
	}, [data]);

	// 空状态
	if (!data || data.records.length === 0) {
		return (
			<div className="p-12 text-center flex flex-col items-center justify-center">
				<p className="text-slate-600 mb-2">暂无分析记录</p>
				<p className="text-sm text-slate-500">
					开始您的第一次文章分析吧！
				</p>
			</div>
		);
	}

	return (
		<div ref={listRef} className="space-y-6">
			{/* 记录列表 / 骨架屏 */}
			<div className="gap-6 grid md:grid-cols-2">
				{isLoading
					? Array.from({ length: data.limit }).map((_, i) => (
							<HistoryCardSkeleton key={i} />
						))
					: data.records.map(record => (
							<HistoryCard
								key={record._id}
								record={record}
								onTogglePublic={handleTogglePublic}
								onDelete={handleDelete}
							/>
						))}
			</div>

			{/* 分页控件 */}
			{data.totalPages > 1 && (
				<div className="pt-4 flex items-center justify-between">
					<p className="text-sm text-slate-600 dark:text-slate-400">
						{isLoading
							? (
									<span className="flex gap-2 items-center">
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
										加载中...
									</span>
								)
							: (
									<>
										第
										{" "}
										{data.page}
										{" "}
										/
										{" "}
										{data.totalPages}
										{" "}
										页，共
										{" "}
										{data.total}
										{" "}
										条记录
									</>
								)}
					</p>

					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => loadPage(data.page - 1)}
							disabled={data.page === 1 || isLoading}
							className="cursor-pointer"
						>
							<ChevronLeft className="mr-1 h-4 w-4" />
							上一页
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => loadPage(data.page + 1)}
							disabled={data.page >= data.totalPages || isLoading}
							className="cursor-pointer"
						>
							下一页
							<ChevronRight className="ml-1 h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

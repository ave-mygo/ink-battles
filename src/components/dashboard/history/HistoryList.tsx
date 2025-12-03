"use client";

import type { DatabaseAnalysisRecord } from "@/types/database/analysis_requests";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getUserAnalysisHistory, toggleRecordPublic } from "@/utils/dashboard";
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
 * 历史记录列表组件
 * 支持分页和公开状态切换
 */
export function HistoryList({ initialData }: HistoryListProps) {
	const [data, setData] = useState(initialData);
	const [isLoading, setIsLoading] = useState(false);

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

	const handleTogglePublic = async (recordId: string, isPublic: boolean) => {
		const result = await toggleRecordPublic(recordId, isPublic);
		if (!result.success) {
			throw new Error(result.message || "操作失败");
		}

		// 更新本地状态
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
	};

	const loadPage = async (newPage: number) => {
		setIsLoading(true);
		try {
			const result = await getUserAnalysisHistory(newPage, data.limit);
			if (result.success && result.data) {
				setData(result.data);
			}
		} catch (error) {
			console.error("加载页面失败:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* 记录列表 */}
			<div className="gap-6 grid md:grid-cols-2">
				{data.records.map(record => (
					<HistoryCard
						key={record._id}
						record={record}
						onTogglePublic={handleTogglePublic}
					/>
				))}
			</div>

			{/* 分页控件 */}
			{data.totalPages > 1 && (
				<div className="pt-4 flex items-center justify-between">
					<p className="text-sm text-slate-600">
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

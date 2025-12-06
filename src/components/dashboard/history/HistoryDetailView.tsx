"use client";

import type { DatabaseAnalysisRecord } from "@/types/database/analysis_requests";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Check, Copy, Globe, Lock } from "lucide-react";
import { useState } from "react";
import { AnalysisResultDisplay } from "@/components/common/AnalysisResultDisplay";
import { SearchCredentials } from "@/components/common/SearchCredentials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toggleRecordPublic } from "@/utils/dashboard";
import { ShareToggle } from "./ShareToggle";

interface HistoryDetailViewProps {
	record: DatabaseAnalysisRecord;
	showShareControls: boolean;
	/** 是否显示原文内容，默认为 true */
	showOriginalText?: boolean;
}

/**
 * 历史记录详情视图组件
 * 用于详细页面和公开分享页面
 */
export function HistoryDetailView({ record, showShareControls, showOriginalText = true }: HistoryDetailViewProps) {
	const [isPublic, setIsPublic] = useState(record.settings?.public || false);
	const [copied, setCopied] = useState(false);
	const timestamp = new Date(record.timestamp);
	const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true, locale: zhCN });

	const shareUrl = typeof window !== "undefined"
		? `${window.location.origin}/share/${record._id}`
		: "";

	const handleTogglePublic = async (recordId: string, newIsPublic: boolean) => {
		const result = await toggleRecordPublic(recordId, newIsPublic);
		if (!result.success) {
			throw new Error(result.message || "操作失败");
		}
		setIsPublic(newIsPublic);
	};

	const copyShareLink = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy:", error);
		}
	};

	return (
		<div className="space-y-6">
			{/* 基本信息卡片 */}
			<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				<CardHeader>
					<div className="flex gap-4 items-start justify-between">
						<div className="flex-1 space-y-1">
							<CardTitle className="flex gap-2 items-center">
								{isPublic
									? (
											<Globe className="text-green-600 h-5 w-5" />
										)
									: (
											<Lock className="text-slate-400 h-5 w-5" />
										)}
								<span>{record.article.input.mode || "默认模式"}</span>
							</CardTitle>
							<CardDescription>
								{timeAgo}
								{" "}
								·
								{timestamp.toLocaleString("zh-CN")}
							</CardDescription>
						</div>

						{record.article.output.overallScore && (
							<Badge variant="secondary" className="text-2xl font-bold px-4 py-2">
								{record.article.output.overallScore}
							</Badge>
						)}
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{/* 分享控制 */}
					{showShareControls && (
						<>
							<div className="flex flex-wrap gap-4 items-center">
								<ShareToggle
									recordId={record._id || ""}
									isPublic={isPublic}
									onToggle={handleTogglePublic}
								/>

								{isPublic && (
									<Button
										variant="outline"
										size="sm"
										onClick={copyShareLink}
										className="cursor-pointer"
									>
										{copied
											? (
													<Check className="text-green-600 mr-2 h-4 w-4" />
												)
											: (
													<Copy className="mr-2 h-4 w-4" />
												)}
										{copied ? "已复制" : "复制分享链接"}
									</Button>
								)}
							</div>
							<Separator />
						</>
					)}

					{/* 标签 */}
					{record.article.output.tags && record.article.output.tags.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{record.article.output.tags.map((tag, index) => (
								<Badge key={index} variant="outline">
									{tag}
								</Badge>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* 输入文本 - 仅在 showOriginalText 为 true 时显示 */}
			{showOriginalText && (
				<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
					<CardHeader>
						<CardTitle>原文内容</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-slate-800 p-4 rounded-lg bg-slate-50 whitespace-pre-wrap dark:text-slate-200 dark:bg-slate-900">
							{record.article.input.articleText}
						</div>
					</CardContent>
				</Card>
			)}

			{/* 搜索凭据 - 如果有搜索结果则显示 */}
			{record.article.input.search?.searchResults && (
				<SearchCredentials
					searchResults={record.article.input.search.searchResults}
					searchWebPages={record.article.input.search.searchWebPages}
				/>
			)}

			{/* 分析结果 */}
			<AnalysisResultDisplay result={record.article.output} readonly={true} />
		</div>
	);
}

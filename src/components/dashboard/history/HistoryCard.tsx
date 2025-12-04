"use client";

import type { AnalysisResult } from "@/types/callback/ai";
import type { DatabaseAnalysisRecord } from "@/types/database/analysis_requests";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar, Clock, Copy, ExternalLink, Globe, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HistoryCardProps {
	record: DatabaseAnalysisRecord;
	onTogglePublic?: (recordId: string, isPublic: boolean) => Promise<void>;
	onDelete?: (recordId: string) => Promise<void>;
}

/**
 * 历史记录卡片组件
 * 用于历史记录列表视图
 */
export function HistoryCard({ record, onTogglePublic, onDelete }: HistoryCardProps) {
	const isPublic = record.settings?.public || false;
	const recordId = record._id || "";
	const timestamp = new Date(record.timestamp);
	const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true, locale: zhCN });
	const [isToggling, setIsToggling] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// AI 输出的总评预览（从 result 字段解析为 AnalysisResult）
	let aiResult: AnalysisResult | null = null;
	try {
		aiResult = JSON.parse(record.article.output.result) as AnalysisResult;
	} catch {
		aiResult = null;
	}

	const overallAssessment = aiResult?.overallAssessment || "";
	const textPreview = overallAssessment.substring(0, 150);

	const handleTogglePublic = async () => {
		if (!onTogglePublic)
			return;
		setIsToggling(true);
		try {
			await onTogglePublic(recordId, !isPublic);
			toast.success(!isPublic ? "已设为公开" : "已设为私密", {
				description: !isPublic
					? "该记录现在可以通过分享链接访问"
					: "该记录现在仅您可见",
			});
		} catch (error) {
			toast.error("操作失败", {
				description: error instanceof Error ? error.message : "请稍后重试",
			});
		} finally {
			setIsToggling(false);
		}
	};

	const handleCopyLink = () => {
		const url = `${window.location.origin}/share/${recordId}`;
		navigator.clipboard.writeText(url);
		toast.success("链接已复制", { description: "快去分享给朋友吧！" });
	};

	const handleDelete = async () => {
		if (!onDelete)
			return;
		setIsDeleting(true);
		try {
			await onDelete(recordId);
			toast.success("删除成功", { description: "分析记录已被删除" });
		} catch (error) {
			toast.error("删除失败", {
				description: error instanceof Error ? error.message : "请稍后重试",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Card className="group border-0 rounded-xl bg-white/80 flex flex-col shadow-lg transition-all duration-300 overflow-hidden backdrop-blur-sm dark:bg-slate-900/80 hover:bg-white/90 hover:shadow-xl dark:hover:bg-slate-900/90">
			<CardHeader className="pb-3">
				<div className="flex gap-4 items-start justify-between">
					<div className="space-y-1.5">
						<div className="flex gap-2 items-center">
							<Badge variant="outline" className="font-medium bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
								{record.article.input.mode || "默认模式"}
							</Badge>
							{isPublic
								? (
										<Badge variant="secondary" className="text-green-700 px-2 border-green-200 bg-green-50 gap-1 dark:text-green-400 dark:border-green-800 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50">
											<Globe className="h-3 w-3" />
											公开
										</Badge>
									)
								: (
										<Badge variant="secondary" className="text-slate-500 px-2 border-slate-200 bg-slate-50 gap-1 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50">
											<Lock className="h-3 w-3" />
											私密
										</Badge>
									)}
						</div>
						<div className="text-xs text-slate-500 flex gap-3 items-center dark:text-slate-400">
							<span className="flex gap-1 items-center">
								<Clock className="h-3.5 w-3.5" />
								{timeAgo}
							</span>
							<span className="flex gap-1 items-center">
								<Calendar className="h-3.5 w-3.5" />
								{timestamp.toLocaleDateString("zh-CN")}
							</span>
						</div>
					</div>

					{/* 评分展示优化 */}
					{record.article.output.overallScore && (
						<div className="flex flex-col items-end">
							<div className="text-2xl text-slate-900 leading-none font-bold dark:text-slate-100">
								{record.article.output.overallScore}
							</div>
							<span className="text-[10px] text-slate-400 tracking-wider font-medium mt-1 uppercase dark:text-slate-500">
								总分
							</span>
						</div>
					)}
				</div>
			</CardHeader>

			<CardContent className="pb-3 flex-1 space-y-4">
				{/* AI 总评预览 */}
				{textPreview && (
					<p className="text-sm text-slate-600 leading-relaxed line-clamp-3 dark:text-slate-300">
						{textPreview}
						{overallAssessment.length > 150 && "..."}
					</p>
				)}

				{/* 标签 */}
				{record.article.output.tags && record.article.output.tags.length > 0 && (
					<div className="pt-1 flex flex-wrap gap-1.5">
						{record.article.output.tags.slice(0, 3).map((tag, index) => (
							<Badge key={index} variant="secondary" className="text-xs text-slate-600 font-normal border-0 bg-slate-100 dark:text-slate-300 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
								{tag}
							</Badge>
						))}
						{record.article.output.tags.length > 3 && (
							<Badge variant="secondary" className="text-xs text-slate-500 font-normal border-0 bg-slate-50 dark:text-slate-400 dark:bg-slate-800/50">
								+
								{record.article.output.tags.length - 3}
							</Badge>
						)}
					</div>
				)}
			</CardContent>

			<div className="mt-auto px-6 py-3 border-t border-slate-100/50 flex items-center justify-between dark:border-slate-700/30">
				<div className="flex gap-2 items-center">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									onClick={handleTogglePublic}
									disabled={isToggling}
									className={cn(
										"h-8 px-3 text-xs font-medium transition-colors",
										isPublic
											? "text-green-600 border-green-200 bg-green-50/80 dark:text-green-400 dark:border-green-800 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50"
											: "text-slate-600 border-slate-200 bg-slate-50/80 dark:text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50",
									)}
								>
									{isToggling
										? (
												<span className="animate-pulse">处理中...</span>
											)
										: (
												<>
													{isPublic ? <Lock className="mr-1.5 h-3.5 w-3.5" /> : <Globe className="mr-1.5 h-3.5 w-3.5" />}
													{isPublic ? "设为私密" : "设为公开"}
												</>
											)}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{isPublic ? "点击将此记录设为仅自己可见" : "点击生成公开链接分享给他人"}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

				{isPublic && (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="text-blue-600 border-blue-200 bg-blue-50/80 h-8 w-8 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer"
									onClick={handleCopyLink}
								>
									<Copy className="h-3.5 w-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>复制分享链接</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}

				{/* 删除按钮 */}
				<AlertDialog>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<AlertDialogTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="text-red-600 border-red-200 bg-red-50/80 h-8 w-8 dark:text-red-400 dark:border-red-800 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer disabled:cursor-not-allowed"
										disabled={isDeleting}
									>
										{isDeleting ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /> : <Trash2 className="h-3.5 w-3.5" />}
									</Button>
								</AlertDialogTrigger>
							</TooltipTrigger>
							<TooltipContent>
								<p>删除记录</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>确认删除</AlertDialogTitle>
							<AlertDialogDescription>
								确定要删除这条分析记录吗？此操作不可撤销，删除后数据将无法恢复。
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								className="bg-red-600 text-white cursor-pointer hover:bg-red-700 focus:ring-red-600"
							>
								删除
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>				<Button variant="default" size="sm" asChild className="text-xs bg-slate-900 h-8 shadow-sm dark:text-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200">
					<Link href={`/dashboard/history/${recordId}`}>
						查看详情
						<ExternalLink className="ml-1.5 h-3 w-3" />
					</Link>
				</Button>
			</div>
		</Card>
	);
}

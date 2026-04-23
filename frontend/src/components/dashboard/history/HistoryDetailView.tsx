"use client";

import type { ScorePercentileResult } from "@ink-battles/shared/types/ai";
import type { DatabaseAnalysisRecord } from "@ink-battles/shared/types/database/analysis_requests";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Check, Copy, Globe, Lock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnalysisResults } from "@/components/common/analysis/AnalysisResults";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuthHydration, useAuthLoading, useIsAuthenticated } from "@/store";
import { toggleRecordPublic } from "@/utils/dashboard/history";
import { ShareToggle } from "./ShareToggle";

interface HistoryDetailViewProps {
	record: DatabaseAnalysisRecord;
	showShareControls: boolean;
	/** 是否显示原文内容，默认为 true */
	showOriginalText?: boolean;
	/** 百分位数据（由服务端传入） */
	percentileData?: ScorePercentileResult | null;
}

/**
 * 历史记录详情视图组件
 * 用于详细页面和公开分享页面
 */
export function HistoryDetailView({ record, showShareControls, showOriginalText = true, percentileData }: HistoryDetailViewProps) {
	const [isShared, setIsShared] = useState(record.settings?.public || false);
	const [copied, setCopied] = useState(false);
	const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
	const timestamp = new Date(record.timestamp);
	const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true, locale: zhCN });
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isLoggedIn = useIsAuthenticated();
	const authLoading = useAuthLoading();
	useAuthHydration();
	const shouldShowGuestNotice = record.uid == null && !authLoading && !isLoggedIn;

	const shareUrl = typeof window !== "undefined"
		? `${window.location.origin}/share/${record._id}`
		: "";

	const handleTogglePublic = async (recordId: string, nextPublicVisibility: boolean) => {
		const result = await toggleRecordPublic(recordId, nextPublicVisibility);
		if (!result.success) {
			throw new Error(result.message || "操作失败");
		}
		setIsShared(nextPublicVisibility);
	};

	const copyShareLink = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(setCopied, 2000, false);
		} catch (error) {
			console.error("Failed to copy:", error);
		}
	};

	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (typeof window !== "undefined" && window.location.hash === "#analysis-results") {
			// Add a slight delay to ensure rendering is complete
			scrollTimeoutRef.current = setTimeout(() => {
				const el = document.getElementById("analysis-results");
				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "start" });
				}
			}, 300);
		}
	}, []);

	useEffect(() => {
		if (!shouldShowGuestNotice || !record.privacy?.expiresAt) {
			setRemainingMinutes(null);
			return;
		}

		const updateRemainingMinutes = () => {
			const remainingMs = new Date(record.privacy?.expiresAt || "").getTime() - Date.now();
			setRemainingMinutes(Math.max(0, Math.ceil(remainingMs / 60000)));
		};

		updateRemainingMinutes();
		const timer = window.setInterval(updateRemainingMinutes, 1000);
		return () => window.clearInterval(timer);
	}, [record.privacy?.expiresAt, shouldShowGuestNotice]);

	return (
		<div className="space-y-6">
			{shouldShowGuestNotice && (
				<Card className="border-amber-200 rounded-2xl bg-amber-50/90 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
					<CardHeader className="gap-3">
						<CardTitle className="flex gap-2 items-center text-amber-900 dark:text-amber-100">
							<ShieldAlert className="h-5 w-5" />
							游客记录保护提醒
						</CardTitle>
						<CardDescription className="text-amber-800/90 dark:text-amber-200/80">
							游客模式下，本记录为了保护用户隐私将在
							{" "}
							{remainingMinutes ?? 15}
							{" "}
							分钟后自动隐藏。注册后可长期保存分析记录并随时回看。
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm text-amber-900/80 dark:text-amber-100/80">
							{record.privacy?.firstViewedAt
								? `倒计时已开始，结果页关闭后也会继续生效。`
								: "首次查看后开始计时。"}
						</div>
						<Button asChild className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700">
							<Link href="/signin">注册或登录后保存记录</Link>
						</Button>
					</CardContent>
				</Card>
			)}

			{/* 基本信息卡片 */}
			<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
				<CardHeader>
					<div className="flex gap-4 items-start justify-between">
						<div className="flex-1 space-y-1">
							<CardTitle className="flex gap-2 items-center">
								{isShared
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
									isShared={isShared}
									onToggle={handleTogglePublic}
								/>

								{isShared && (
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
			<div id="analysis-results">
				<AnalysisResults
					result={record.article.output}
					searchInfo={record.article.input.search}
					modelName={record.metadata?.modelName}
					modeName={record.article.input.mode}
					percentileData={percentileData}
				/>
			</div>
		</div>
	);
}

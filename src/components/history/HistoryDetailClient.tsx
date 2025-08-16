"use client";

import type { AnalysisDetailItem } from "@/lib/analysis-history";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import WriterAnalysisResult from "@/components/layouts/WriterPage/WriterAnalysisResult";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function getScoreColor(score: number) {
	if (score >= 80)
		return "text-green-600";
	if (score >= 60)
		return "text-yellow-600";
	return "text-red-600";
}

function getScoreBgColor(score: number) {
	if (score >= 80)
		return "bg-green-100";
	if (score >= 60)
		return "bg-yellow-100";
	return "bg-red-100";
}

export default function HistoryDetailClient({ id }: { id: string }) {
	const [detail, setDetail] = useState<AnalysisDetailItem | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		const fetchDetail = async () => {
			try {
				setLoading(true);
				const res = await fetch(`/api/user/analysis-history/${id}`);
				const data = await res.json();
				if (!res.ok)
					throw new Error(data.error || "获取详情失败");
				setDetail(data);
			} catch (e) {
				setError(e instanceof Error ? e.message : "获取详情失败");
			} finally {
				setLoading(false);
			}
		};
		fetchDetail();
	}, [id]);

	if (loading) {
		return (
			<div className="mx-auto p-6 container max-w-6xl">
				<div className="mb-4">
					<Button variant="ghost" onClick={() => router.back()}>
						<ChevronLeft className="mr-1 h-4 w-4" />
						{" "}
						返回
					</Button>
				</div>
				<div className="gap-6 grid md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardHeader>
								<CardTitle>
									<Skeleton className="h-5 w-32" />
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
								<Skeleton className="h-40 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (error || !detail) {
		return (
			<div className="mx-auto p-6 container max-w-6xl">
				<div className="mb-4">
					<Button variant="ghost" onClick={() => router.back()}>
						<ChevronLeft className="mr-1 h-4 w-4" />
						{" "}
						返回
					</Button>
				</div>
				<Alert variant="destructive">
					<AlertDescription>{error || "未找到记录"}</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="mx-auto p-6 container max-w-7xl">
			{/* Header with back button */}
			<div className="mb-6">
				<Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
					<ChevronLeft className="mr-2 h-4 w-4" />
					返回历史列表
				</Button>

				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-3xl tracking-tight font-bold">分析详情</h1>
						<div className="mt-2 flex gap-4 items-center">
							<p className="text-muted-foreground text-sm">
								{new Date(detail.timestamp).toLocaleString("zh-CN", {
									year: "numeric",
									month: "long",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})}
							</p>
							<div className={`text-sm font-medium px-3 py-1 rounded-full ${getScoreBgColor(detail.overallScore)}  ${getScoreColor(detail.overallScore)}`}>
								总分
								{" "}
								{detail.overallScore}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Analysis Result */}
			<div className="space-y-6">
				<WriterAnalysisResult
					analysisResult={detail.analysisResult}
					getScoreColor={getScoreColor}
					getScoreBgColor={getScoreBgColor}
				/>
			</div>
		</div>
	);
}

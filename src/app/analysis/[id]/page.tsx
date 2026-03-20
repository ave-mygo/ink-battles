import type { Metadata } from "next";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryDetailView } from "@/components/dashboard/history/HistoryDetailView";
import { Button } from "@/components/ui/button";
import { getScorePercentile } from "@/lib/ai";
import { getViewableAnalysisRecord } from "@/utils/dashboard/history";

interface AnalysisDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: `分析结果`,
		description: "查看作家的战力分析结果",
	};
}

export default async function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
	const { id } = await params;
	const result = await getViewableAnalysisRecord(id);

	if (!result.success || !result.data) {
		notFound();
	}

	// 在服务端获取百分位数据
	const record = result.data;
	let percentileData = null;
	if (record.metadata?.modelName && record.article?.output?.overallScore) {
		percentileData = await getScorePercentile(
			record.article.output.overallScore,
			record.metadata.modelName,
			record.article.input.mode,
		);
	}

	return (
		<div className="p-4 min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto py-4 max-w-6xl space-y-6">
				{/* 顶部导航 */}
				<div className="flex gap-4 items-center justify-between">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/">
							<Home className="mr-2 h-4 w-4" />
							返回首页
						</Link>
					</Button>
					<Button variant="ghost" size="sm" asChild>
						<Link href="/dashboard/history">
							返回历史记录
							<ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
						</Link>
					</Button>
				</div>

				{/* 详情视图 */}
				<HistoryDetailView
					record={record}
					showShareControls={false}
					showOriginalText={false}
					percentileData={percentileData}
				/>
			</div>
		</div>
	);
}

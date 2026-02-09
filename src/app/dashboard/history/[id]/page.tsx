import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryDetailView } from "@/components/dashboard/history/HistoryDetailView";
import { Button } from "@/components/ui/button";
import { getScorePercentile } from "@/lib/ai";
import { getAnalysisRecordById } from "@/utils/dashboard";

interface HistoryDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: `分析记录详情`,
		description: "查看分析记录的详细信息",
	};
}

export default async function HistoryDetailPage({ params }: HistoryDetailPageProps) {
	const { id } = await params;
	const result = await getAnalysisRecordById(id);

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
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			{/* 返回按钮 */}
			<div className="flex gap-4 items-center">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/dashboard/history">
						<ArrowLeft className="mr-2 h-4 w-4" />
						返回历史记录
					</Link>
				</Button>
			</div>

			{/* 详情视图 */}
			<HistoryDetailView
				record={result.data}
				showShareControls={true}
				percentileData={percentileData}
			/>
		</div>
	);
}

import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryDetailView } from "@/components/dashboard/history/HistoryDetailView";
import { Button } from "@/components/ui/button";
import { getAnalysisRecordById } from "@/utils/dashboard";

interface HistoryDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function generateMetadata({ params }: HistoryDetailPageProps): Promise<Metadata> {
	const { id } = await params;
	return {
		title: `分析记录详情 - ${id}`,
		description: "查看分析记录的详细信息",
	};
}

export default async function HistoryDetailPage({ params }: HistoryDetailPageProps) {
	const { id } = await params;
	const result = await getAnalysisRecordById(id);

	if (!result.success || !result.data) {
		notFound();
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
			<HistoryDetailView record={result.data} showShareControls={true} />
		</div>
	);
}

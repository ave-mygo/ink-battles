import type { Metadata } from "next";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryDetailView } from "@/components/dashboard/history/HistoryDetailView";
import { Button } from "@/components/ui/button";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

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
	const api = await createServerEden();
	const taskResponse = await api.api.v2.analysis.tasks({ taskId: id }).get();
	const task = await normalizeEdenResult<any>(taskResponse.data, taskResponse.error, "任务不存在");
	const result = task.success && task.resultId
		? await normalizeEdenResult<any>(
				...(await (async () => {
					const response = await api.api.v2.analysis.tasks({ taskId: id }).result.get();
					return [response.data, response.error] as const;
				})()),
				"任务结果不存在",
			)
		: await normalizeEdenResult<any>(
				...(await (async () => {
					const response = await api.api.v2.analysis.history({ id }).get();
					return [response.data, response.error] as const;
				})()),
				"记录不存在",
			);

	if (!result.success || !result.data?.record) {
		notFound();
	}

	const record = result.data.record;
	const percentileData = null;

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

import type { Metadata } from "next";
import { History } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { HistoryList } from "@/components/dashboard/history/HistoryList";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

export const metadata: Metadata = {
	title: "分析历史",
	description: "查看您的全部分析记录",
};

export default async function HistoryPage() {
	// 获取第一页数据（服务器端）
	const api = await createServerEden();
	const response = await api.api.v2.analysis.history.get({
		query: { page: 1, limit: 10 },
	});
	const result = await normalizeEdenResult<any>(response.data, response.error, "无法加载历史记录");
	const data = result.success
		? {
				records: result.data.records,
				total: result.data.pagination.total,
				page: result.data.pagination.page,
				limit: result.data.pagination.limit,
				totalPages: result.data.pagination.totalPages,
			}
		: undefined;

	if (!result.success) {
		return (
			<div className="mx-auto max-w-6xl space-y-6">
				<DashboardPageHeader
					icon={History}
					title="分析历史"
					description="查看您的全部分析记录"
				/>
				<div className="p-12 flex items-center justify-center">
					<p className="text-slate-600">{result.message || "无法加载历史记录"}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<DashboardPageHeader
				icon={History}
				title="分析历史"
				description={`共 ${data?.total || 0} 条分析记录`}
			/>

			<HistoryList initialData={data} />
		</div>
	);
}

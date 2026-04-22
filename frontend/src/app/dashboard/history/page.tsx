import type { HistoryPageResult } from "@ink-battles/shared/types/common/history";
import type { Metadata } from "next";
import { History } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { HistoryList } from "@/components/dashboard/history/HistoryList";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";
import { mapHistoryData } from "@/utils/dashboard/history-shared";

export const metadata: Metadata = {
	title: "分析历史",
	description: "查看您的全部分析记录",
};

export default async function HistoryPage() {
	const initialSort = "time_desc" as const;
	const initialVisibility = "all" as const;
	const initialSortQuery = { sortBy: "time", sortOrder: "desc" } as const;

	// 获取第一页数据（服务器端）
	const api = await createServerEden();
	const response = await api.api.v2.analysis.history.get({
		query: { page: 1, limit: 10, visibility: initialVisibility, ...initialSortQuery },
	});
	const result = await normalizeEdenResult<HistoryPageResult>(response.data, response.error, "无法加载历史记录");
	const data = result.success && result.data ? mapHistoryData(result.data) : undefined;

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

			<HistoryList initialData={data} initialSort={initialSort} initialVisibility={initialVisibility} />
		</div>
	);
}

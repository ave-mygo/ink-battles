import type { Metadata } from "next";
import StatusDashboard from "@/components/layouts/Status/StatusDashboard";
import { getStatusPage } from "@/utils/status/server";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "系统状态",
		description: "查看系统运行状态、服务可用性和性能监控信息",
	};
}

export default async function StatusPage() {
	const initialData = await getStatusPage(1, 20);

	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-7xl">
				<StatusDashboard initialData={initialData} />
			</div>
		</div>
	);
}

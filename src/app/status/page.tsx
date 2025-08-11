import type { Metadata } from "next";
import StatusDashboard from "@/components/layouts/Status/StatusDashboard";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "系统状态",
		description: "查看系统运行状态、服务可用性和性能监控信息",
	};
}

export default function StatusPage() {
	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-7xl">
				<StatusDashboard />
			</div>
		</div>
	);
}

import type { Metadata } from "next";
import StatusDashboard from "@/components/layouts/Status/StatusDashboard";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "系统状态 - 作家战力分析系统",
		description: "实时监控作家战力分析系统的运行状态、API可用性与性能表现。查看服务uptime统计、事件日志与可靠性报告。",
	};
}

export default function StatusPage() {
	return (
		<main className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-7xl">
				<StatusDashboard />
			</div>
		</main>
	);
}

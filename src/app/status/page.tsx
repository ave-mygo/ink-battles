import StatusDashboard from "@/components/layouts/Status/StatusDashboard";

export default function StatusPage() {
	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-7xl">
				<StatusDashboard />
			</div>
		</div>
	);
}

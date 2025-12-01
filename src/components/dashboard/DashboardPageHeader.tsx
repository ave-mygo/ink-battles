import type { LucideIcon } from "lucide-react";

interface DashboardPageHeaderProps {
	icon: LucideIcon;
	title: string;
	description: string;
}

export function DashboardPageHeader({ icon: Icon, title, description }: DashboardPageHeaderProps) {
	return (
		<div className="mb-2 flex gap-3 items-center">
			<div className="rounded-xl flex h-10 w-10 shadow-md items-center justify-center from-blue-500 to-indigo-600 bg-linear-to-br dark:from-blue-700 dark:to-indigo-700">
				<Icon className="text-white h-5 w-5" />
			</div>
			<div>
				<h1 className="text-2xl text-slate-900 font-bold md:text-3xl dark:text-slate-100">
					{title}
				</h1>
				<p className="text-slate-600 mt-1 dark:text-slate-400">
					{description}
				</p>
			</div>
		</div>
	);
}

"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDashboardSidebarActions } from "@/store/ui";
import { HeaderNav } from "./HeaderNav";

/**
 * 顶部站点导航
 * - 固定顶栏，半透明毛玻璃
 * - 提供首页、赞助、登录、注册入口
 */
export const AppHeader = () => {
	const pathname = usePathname();
	const { toggle } = useDashboardSidebarActions();

	const inDashboard = pathname?.startsWith("/dashboard");

	return (
		<div
			style={{ isolation: "isolate" }}
			className="supports-backdrop-filter:bg-white/60 dark:supports-backdrop-filter:bg-slate-900/60 border-b border-white/40 bg-white/60 top-0 sticky z-40 backdrop-blur dark:border-white/10 dark:bg-slate-900/60"
		>
			<div className="mx-auto px-3 container flex h-14 max-w-6xl items-center justify-between sm:px-4">
				<div className="flex gap-2 items-center">
					{inDashboard && (
						<Button
							variant="outline"
							size="sm"
							aria-label="打开仪表盘菜单"
							className="lg:hidden"
							onClick={toggle}
						>
							<Menu className="mr-1 h-4 w-4" />
							菜单
						</Button>
					)}
					<Link href="/" className="text-sm text-slate-900 font-semibold transition-opacity sm:text-base dark:text-slate-100 hover:opacity-90">
						<span className="hidden sm:inline">作家战力分析</span>
					</Link>
				</div>
				<HeaderNav />
			</div>
		</div>
	);
};

export default AppHeader;

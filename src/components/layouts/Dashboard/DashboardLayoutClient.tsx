"use client";

import type { AuthUserInfoSafe } from "@/types/users/user";
import { ChevronLeft, ChevronRight, Link as LinkIcon, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useDashboardSidebarActions, useDashboardSidebarOpen } from "@/store/ui";

interface DashboardLayoutClientProps {
	user: AuthUserInfoSafe;
	children: React.ReactNode;
}

interface NavItem {
	label: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
	{ label: "用户信息", href: "/dashboard/profile", icon: User },
	{ label: "账号绑定与管理", href: "/dashboard/accounts", icon: LinkIcon },
];

/**
 * 仪表盘布局客户端组件
 * 提供可折叠侧边栏和主内容区域
 */
export const DashboardLayoutClient = ({ children }: DashboardLayoutClientProps) => {
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const mobileOpen = useDashboardSidebarOpen();
	const { close } = useDashboardSidebarActions();
	const pathname = usePathname();
	const mainOffsetClass = isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64";

	return (
		<div className="flex min-h-screen">
			<aside
				style={{ overscrollBehaviorY: "contain" }}
				className={`supports-backdrop-filter:bg-white/60 dark:supports-backdrop-filter:bg-slate-900/60 border-r border-t border-white/40 bg-white/60 w-64 shadow-sm transition-transform duration-300 bottom-0 left-0 top-[calc(3.5rem-1px)] fixed z-40 overflow-y-auto backdrop-blur dark:border-white/10 dark:bg-slate-900/60 ${
					mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
				}  ${isSidebarCollapsed ? "lg:w-16" : "lg:w-64"}`}
			>
				<nav className="p-4 flex flex-col h-full">
					{/* 导航项 */}
					<ul className="space-y-2">
						{NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isActive = pathname === item.href;

							return (
								<li key={item.href}>
									<Link
										href={item.href}
										className={`${
											isActive
												? "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"
												: "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors text-slate-700 hover:text-slate-900 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
										}  ${isSidebarCollapsed ? "justify-center" : ""}`}
										onClick={close}
										title={isSidebarCollapsed ? item.label : undefined}
									>
										<Icon className="shrink-0 h-5 w-5" />
										{!isSidebarCollapsed && (
											<span className="text-sm font-medium">{item.label}</span>
										)}
									</Link>
								</li>
							);
						})}
					</ul>

					{/* 底部折叠按钮 */}
					<div className="mt-auto pt-4 hidden lg:block">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
							className={`w-full ${isSidebarCollapsed ? "px-0" : ""}`}
						>
							{isSidebarCollapsed
								? (
										<ChevronRight className="h-4 w-4" />
									)
								: (
										<>
											<ChevronLeft className="mr-2 h-4 w-4" />
											<span>收起菜单</span>
										</>
									)}
						</Button>
					</div>
				</nav>
			</aside>
			{mobileOpen && (
				<div
					className="bg-transparent inset-x-0 bottom-0 top-14 fixed z-30 lg:hidden"
					onClick={close}
					aria-hidden="true"
				/>
			)}

			{/* 主内容：移除背景色以继承全局渐变背景 */}
			<main className={`p-4 flex-1 transition-all duration-300 lg:p-8 sm:p-6 ${mainOffsetClass}`}>
				{children}
			</main>
		</div>
	);
};

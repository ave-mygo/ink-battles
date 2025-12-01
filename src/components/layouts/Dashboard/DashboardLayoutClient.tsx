"use client";

import type { AuthUserInfoSafe } from "@/types/users/user";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_NAV_ITEMS } from "@/config";
import { cn } from "@/lib/utils";
import { useDashboardSidebarActions, useDashboardSidebarOpen } from "@/store/ui";

interface DashboardLayoutClientProps {
	user: AuthUserInfoSafe;
	children: React.ReactNode;
}

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

	useEffect(() => {
		// 计算滚动条宽度
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

		// 设置 body 样式：禁用溢出滚动，固定高度为视口高度
		document.body.style.overflow = "hidden";
		document.body.style.height = "100vh";
		// 补偿滚动条宽度，防止页面抖动
		if (scrollbarWidth > 0) {
			document.body.style.paddingRight = `${scrollbarWidth}px`;
		}

		// 组件卸载时恢复原样式
		return () => {
			document.body.style.overflow = "";
			document.body.style.height = "";
			document.body.style.paddingRight = "";
		};
	}, []);

	return (
		<div className="flex">
			<aside
				style={{ overscrollBehaviorY: "contain" }}
				className={cn(
					"fixed bottom-0 left-0 top-14 z-40 overflow-y-auto border-r shadow-sm transition-transform duration-300",
					"bg-white/80 backdrop-blur-md dark:bg-slate-950/80 dark:border-slate-800/60",
					mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
					isSidebarCollapsed ? "lg:w-16" : "lg:w-64",
				)}
			>
				<nav className="p-4 flex flex-col h-full">
					{/* 导航项 */}
					<ul className="space-y-2">
						{DASHBOARD_NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const isActive = pathname === item.href;

							return (
								<li key={item.href}>
									<Button
										variant={isActive ? "secondary" : "ghost"}
										asChild
										className={cn(
											"w-full justify-start h-10",
											isActive && "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30",
											isSidebarCollapsed && "justify-center px-0",
										)}
									>
										<Link
											href={item.href}
											onClick={close}
											title={isSidebarCollapsed ? item.label : undefined}
										>
											<Icon className={cn("h-5 w-5", !isSidebarCollapsed && "mr-3")} />
											{!isSidebarCollapsed && (
												<span>{item.label}</span>
											)}
										</Link>
									</Button>
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
					className="bg-black/20 inset-x-0 bottom-0 top-14 fixed z-30 backdrop-blur-sm lg:hidden"
					onClick={close}
					aria-hidden="true"
				/>
			)}

			{/* 主内容区域 */}
			<main className={`p-4 pt-6 flex-1 transition-all duration-300 overflow-y-auto lg:p-8 sm:p-6 lg:pt-8 sm:pt-8 ${mainOffsetClass}`}>
				{children}
			</main>
		</div>
	);
};

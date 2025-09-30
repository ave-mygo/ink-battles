"use client";

import { Heart, Home, LayoutDashboard, LogIn, LogOut, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/common/theme/toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthActions, useAuthHydration, useAuthLoading, useIsAuthenticated } from "@/store";

interface NavItem {
	href: string;
	label: string;
	icon?: React.ReactNode;
	variant?: "ghost" | "outline" | "default" | "secondary" | "destructive" | "link";
	cta?: boolean;
}

/**
 * 头部导航链接组（统一尺寸与间距，图标左侧对齐）
 */
export const HeaderNav = () => {
	const pathname = usePathname();
	const isLoggedIn = useIsAuthenticated();
	const loading = useAuthLoading();
	const { logout } = useAuthActions();

	// 确保客户端水合完成
	useAuthHydration();

	// 开发调试请改用 console.warn 或 console.error 避免 lint 报错

	const baseBtn = (variant: NavItem["variant"] = "default") =>
		buttonVariants({ size: "sm", variant });

	return (
		<nav className="flex gap-2 items-center sm:gap-4">
			{/* 左侧：主要导航 */}
			<div className="flex gap-1 items-center sm:gap-1.5">
				<Button
					asChild
					size="sm"
					variant="ghost"
					className={cn(
						baseBtn("ghost"),
						"px-2 sm:px-3 rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300",
						"dark:hover:bg-slate-800/70 dark:focus-visible:ring-slate-700",
						pathname === "/" && "bg-secondary dark:bg-slate-800/60",
					)}
				>
					<Link href="/" className="flex gap-1 items-center sm:gap-2">
						<Home className="h-4 w-4" />
						<span className="hidden sm:inline">首页</span>
					</Link>
				</Button>

				<Button
					asChild
					size="sm"
					variant="outline"
					className={cn(
						baseBtn("outline"),
						"px-2 sm:px-3 rounded-full border-pink-300 text-pink-700 hover:bg-pink-50",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-300",
						"dark:border-pink-500/30 dark:text-pink-300 dark:hover:bg-pink-500/10 dark:focus-visible:ring-pink-800",
						pathname === "/sponsors" && "bg-secondary dark:bg-slate-800/60",
					)}
				>
					<Link href="/sponsors" className="flex gap-1 items-center sm:gap-2">
						<Heart className="h-4 w-4" />
						<span className="hidden sm:inline">赞助</span>
					</Link>
				</Button>
			</div>

			{/* 分隔线 */}
			<div className="bg-border mx-0.5 h-6 w-px sm:mx-1" />

			{/* 主题切换 */}
			<ThemeToggle />

			{/* 分隔线 */}
			<div className="bg-border mx-0.5 h-6 w-px sm:mx-1" />

			{/* 右侧：账户与入口 */}
			<div className="flex gap-1 items-center sm:gap-1.5">
				{loading
					? (
							<div className="text-muted-foreground text-xs px-2 sm:px-3">加载中…</div>
						)
					: isLoggedIn
						? (
								<>
									<Button
										asChild
										size="sm"
										className={cn(
											baseBtn("default"),
											"px-2 sm:px-3 rounded-full shadow-sm hover:bg-primary/90",
											"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
											"dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-50 dark:focus-visible:ring-slate-600",
											pathname === "/dashboard" && "bg-primary/90 dark:bg-slate-600",
										)}
									>
										<Link href="/dashboard" className="flex gap-1 items-center sm:gap-2">
											<LayoutDashboard className="h-4 w-4" />
											<span className="hidden sm:inline">仪表盘</span>
										</Link>
									</Button>
									<Button
										size="sm"
										variant="outline"
										className="text-red-600 px-2 border-red-200 rounded-full dark:text-red-300 sm:px-3 focus-visible:outline-none dark:border-red-700 hover:bg-red-50 focus-visible:ring-1 focus-visible:ring-red-300 dark:hover:bg-red-500/10 dark:focus-visible:ring-red-800"
										onClick={logout}
									>
										<LogOut className="h-4 w-4 sm:mr-1" />
										<span className="hidden sm:inline">退出</span>
									</Button>
								</>
							)
						: (
								<>
									<Button
										asChild
										size="sm"
										variant="ghost"
										className={cn(
											baseBtn("ghost"),
											"px-2 sm:px-3 rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300",
											"dark:hover:bg-slate-800/70 dark:focus-visible:ring-slate-700",
											pathname === "/signin" && "bg-secondary dark:bg-slate-800/60",
										)}
									>
										<Link href="/signin" className="flex gap-1 items-center sm:gap-2">
											<LogIn className="h-4 w-4" />
											<span className="hidden sm:inline">登录</span>
										</Link>
									</Button>
									<Button
										asChild
										size="sm"
										className={cn(
											baseBtn("default"),
											"px-2 sm:px-3 rounded-full shadow-sm hover:bg-primary/90",
											"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
											"dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-50 dark:focus-visible:ring-slate-600",
											pathname === "/signup" && "bg-secondary dark:bg-slate-800/60",
										)}
									>
										<Link href="/signup" className="flex gap-1 items-center sm:gap-2">
											<UserPlus className="h-4 w-4" />
											<span className="hidden sm:inline">注册</span>
										</Link>
									</Button>
								</>
							)}
			</div>
		</nav>
	);
};

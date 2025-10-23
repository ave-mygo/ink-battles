"use client";

import { Activity, Heart, Home, Info, LayoutDashboard, LogIn, LogOut, UserPlus } from "lucide-react";
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

	// 根据路由动态挑选最多三个导航项：固定包含首页 + 另外两个（首页：关于+赞助；其余按优先级补足）
	const leftItems = (() => {
		type ItemKey = "home" | "about" | "sponsors" | "status";
		const all: Record<ItemKey, { href: string; label: string; icon: React.ReactNode; variant?: NavItem["variant"]; className?: string }>
			= {
				home: {
					href: "/",
					label: "首页",
					icon: <Home className="h-4 w-4" />,
					variant: "ghost",
				},
				about: {
					href: "/about",
					label: "关于",
					icon: <Info className="h-4 w-4" />,
					variant: "outline",
				},
				sponsors: {
					href: "/sponsors",
					label: "赞助",
					icon: <Heart className="h-4 w-4" />,
					variant: "outline",
				},
				status: {
					href: "/status",
					label: "状态",
					icon: <Activity className="h-4 w-4" />,
					variant: "outline",
				},
			};

		const order: ItemKey[] = ["about", "sponsors", "status"]; // 首页优先显示 关于 + 赞助
		const currentKey: ItemKey | null = pathname === "/"
			? "home"
			: pathname?.startsWith("/about")
				? "about"
				: pathname?.startsWith("/sponsors")
					? "sponsors"
					: pathname?.startsWith("/status")
						? "status"
						: null;

		const result: ItemKey[] = ["home"]; // 固定包含首页

		// 过滤掉当前所在项与已选，按优先级补足两个
		for (const key of order) {
			if (result.length >= 3)
				break;
			if (key === currentKey)
				continue;
			result.push(key);
		}

		return result.map(key => all[key]);
	})();

	return (
		<nav className="flex gap-2 items-center sm:gap-4">
			{/* 左侧：主要导航（最多三个） */}
			<div className="flex gap-1 items-center sm:gap-1.5">
				{leftItems.map(item => (
					<Button
						key={item.href}
						asChild
						size="sm"
						variant={item.variant ?? "ghost"}
						className={cn(
							baseBtn(item.variant ?? "ghost"),
							"px-2 sm:px-3 rounded-full",
							item.variant === "ghost"
							&& "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:hover:bg-slate-800/70 dark:focus-visible:ring-slate-700",
							item.href === "/sponsors"
							&& "border-pink-300 text-pink-700 hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pink-300 dark:border-pink-500/30 dark:text-pink-300 dark:hover:bg-pink-500/10 dark:focus-visible:ring-pink-800",
							item.href === "/about"
							&& "border-blue-300 text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10 dark:focus-visible:ring-blue-800",
							item.href === "/status"
							&& "border-green-300 text-green-700 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-300 dark:border-green-500/30 dark:text-green-300 dark:hover:bg-green-500/10 dark:focus-visible:ring-green-800",
							pathname === item.href && "bg-secondary dark:bg-slate-800/60",
						)}
					>
						<Link href={item.href} className="flex gap-1 items-center sm:gap-2">
							{item.icon}
							<span className="hidden sm:inline">{item.label}</span>
						</Link>
					</Button>
				))}
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

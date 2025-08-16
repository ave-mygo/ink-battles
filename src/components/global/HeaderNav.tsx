"use client";

import { Heart, Home, LayoutDashboard, LogIn, LogOut, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

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
	const { user, loading, logout } = useAuth();

	const baseBtn = (variant: NavItem["variant"] = "default") =>
		buttonVariants({ size: "sm", variant });

	return (
		<nav className="flex gap-2 items-center sm:gap-4">
			{/* 左侧：主要导航 */}
			<div className="flex gap-1 items-center sm:gap-1.5">
				<Button asChild size="sm" variant="ghost" className={cn(baseBtn("ghost"), "px-2 sm:px-3 rounded-full", pathname === "/" && "bg-secondary")}>
					<Link href="/" className="flex gap-1 items-center sm:gap-2">
						<Home className="h-4 w-4" />
						<span className="hidden sm:inline">首页</span>
					</Link>
				</Button>

				<Button asChild size="sm" variant="outline" className={cn(baseBtn("outline"), "px-2 sm:px-3 rounded-full border-pink-300 text-pink-700 hover:bg-pink-50", pathname === "/sponsors" && "bg-secondary")}>
					<Link href="/sponsors" className="flex gap-1 items-center sm:gap-2">
						<Heart className="h-4 w-4" />
						<span className="hidden sm:inline">赞助</span>
					</Link>
				</Button>
			</div>

			{/* 分隔线 */}
			<div className="bg-border mx-0.5 h-6 w-px sm:mx-1" />

			{/* 右侧：账户与入口 */}
			<div className="flex gap-1 items-center sm:gap-1.5">
				{loading
					? (
							<div className="text-muted-foreground text-xs px-2 sm:px-3">加载中…</div>
						)
					: user?.isLoggedIn
						? (
								<>
									<Button asChild size="sm" className={cn(baseBtn("default"), "px-2 sm:px-3 rounded-full shadow-sm", pathname === "/dashboard" && "bg-primary/90")}>
										<Link href="/dashboard" className="flex gap-1 items-center sm:gap-2">
											<LayoutDashboard className="h-4 w-4" />
											<span className="hidden sm:inline">仪表盘</span>
										</Link>
									</Button>
									<Button size="sm" variant="outline" className="text-red-600 px-2 border-red-200 rounded-full sm:px-3 hover:bg-red-50" onClick={logout}>
										<LogOut className="h-4 w-4 sm:mr-1" />
										<span className="hidden sm:inline">退出</span>
									</Button>
								</>
							)
						: (
								<>
									<Button asChild size="sm" variant="ghost" className={cn(baseBtn("ghost"), "px-2 sm:px-3 rounded-full", pathname === "/signin" && "bg-secondary")}>
										<Link href="/signin" className="flex gap-1 items-center sm:gap-2">
											<LogIn className="h-4 w-4" />
											<span className="hidden sm:inline">登录</span>
										</Link>
									</Button>
									<Button asChild size="sm" className={cn(baseBtn("default"), "px-2 sm:px-3 rounded-full shadow-sm", pathname === "/signup" && "bg-secondary")}>
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

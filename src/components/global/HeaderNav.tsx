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
		<nav className="flex gap-4 items-center">
			{/* 左侧：主要导航 */}
			<div className="flex gap-1.5 items-center">
				<Button asChild size="sm" variant="ghost" className={cn(baseBtn("ghost"), "px-3", pathname === "/" && "bg-secondary")}>
					<Link href="/" className="flex gap-2 items-center">
						<Home className="h-4 w-4" />
						<span>首页</span>
					</Link>
				</Button>

				<Button asChild size="sm" variant="outline" className={cn(baseBtn("outline"), "px-3 border-pink-500/60 text-pink-700 hover:bg-pink-50", pathname === "/sponsors" && "bg-secondary")}>
					<Link href="/sponsors" className="flex gap-2 items-center">
						<Heart className="h-4 w-4" />
						<span>赞助</span>
					</Link>
				</Button>
			</div>

			{/* 分隔线 */}
			<div className="bg-border mx-1 h-6 w-px" />

			{/* 右侧：账户与入口 */}
			<div className="flex gap-1.5 items-center">
				{loading
					? (
							<div className="text-muted-foreground text-xs px-3">加载中…</div>
						)
					: user?.isLoggedIn
						? (
								<>
									<Button asChild size="sm" className={cn(baseBtn("default"), "px-3", pathname === "/dashboard" && "bg-primary/90")}>
										<Link href="/dashboard" className="flex gap-2 items-center">
											<LayoutDashboard className="h-4 w-4" />
											<span>仪表盘</span>
										</Link>
									</Button>
									<Button size="sm" variant="outline" className="text-red-600 px-3 border-red-200 hover:bg-red-50" onClick={logout}>
										<LogOut className="mr-1 h-4 w-4" />
										退出
									</Button>
								</>
							)
						: (
								<>
									<Button asChild size="sm" variant="ghost" className={cn(baseBtn("ghost"), "px-3", pathname === "/signin" && "bg-secondary")}>
										<Link href="/signin" className="flex gap-2 items-center">
											<LogIn className="h-4 w-4" />
											<span>登录</span>
										</Link>
									</Button>
									<Button asChild size="sm" className={cn(baseBtn("default"), "px-3", pathname === "/signup" && "bg-secondary")}>
										<Link href="/signup" className="flex gap-2 items-center">
											<UserPlus className="h-4 w-4" />
											<span>注册</span>
										</Link>
									</Button>
								</>
							)}
			</div>
		</nav>
	);
};

"use client";

import { Heart, Home, LogIn, LogOut, User, UserPlus } from "lucide-react";
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
		<nav className="flex gap-1.5 items-center">
			{/* 常驻入口 */}
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

			{/* 右侧：登录态切换 */}
			{loading
				? (
						<div className="text-muted-foreground text-xs px-3">加载中…</div>
					)
				: user?.isLoggedIn
					? (
							<div className="flex gap-1.5 items-center">
								<span className="text-sm text-slate-700 px-3 py-1 border rounded-md bg-slate-100 hidden items-center sm:flex">
									<User className="mr-1 h-4 w-4" />
									{" "}
									{user.email}
								</span>
								<Button size="sm" variant="outline" className="px-3" onClick={logout}>
									<LogOut className="mr-1 h-4 w-4" />
									{" "}
									退出
								</Button>
							</div>
						)
					: (
							<>
								<Button asChild size="sm" variant="outline" className={cn(baseBtn("outline"), "px-3", pathname === "/signin" && "bg-secondary")}>
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
		</nav>
	);
};

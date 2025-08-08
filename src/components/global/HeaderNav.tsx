"use client";

import { Heart, Home, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
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

	const items: NavItem[] = [
		{ href: "/", label: "首页", icon: <Home className="h-4 w-4" />, variant: "ghost" },
		{ href: "/sponsors", label: "赞助", icon: <Heart className="h-4 w-4" />, variant: "outline", cta: true },
		{ href: "/signin", label: "登录", icon: <LogIn className="h-4 w-4" />, variant: "outline" },
		{ href: "/signup", label: "注册", icon: <UserPlus className="h-4 w-4" /> },
	];

	return (
		<nav className="flex gap-1.5 items-center">
			{items.map((item) => {
				const isActive = pathname === item.href;
				const base = buttonVariants({ size: "sm", variant: item.variant || "default" });
				const className = cn(
					base,
					"px-3",
					isActive && "bg-secondary",
					item.cta && "border-pink-500/60 text-pink-700 hover:bg-pink-50",
				);
				return (
					<Button key={item.href} asChild size="sm" variant={item.variant || "default"} className={className}>
						<Link href={item.href} className="flex gap-2 items-center">
							{item.icon}
							<span>{item.label}</span>
						</Link>
					</Button>
				);
			})}
		</nav>
	);
};

// 命名导出，遵循项目导入规范

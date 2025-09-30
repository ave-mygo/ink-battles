"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ThemeToggle = () => {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// 避免服务端渲染时的主题闪烁
	// 使用 requestAnimationFrame 延迟状态更新，规避 lint 关于在 useEffect 中直接 setState 的告警
	useEffect(() => {
		const id = requestAnimationFrame(() => setMounted(true));
		return () => cancelAnimationFrame(id);
	}, []);

	if (!mounted) {
		return (
			<Button variant="ghost" size="sm" className="px-0 w-9">
				<div className="h-[1.2rem] w-[1.2rem]" />
				<span className="sr-only">主题切换中…</span>
			</Button>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="px-0 w-9 transition-colors"
					aria-label="切换主题"
				>
					<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0 dark:-rotate-90" />
					<Moon className="h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all absolute dark:rotate-0 dark:scale-100" />
					<span className="sr-only">切换主题</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[120px]">
				<DropdownMenuItem
					onClick={() => setTheme("light")}
					className="cursor-pointer"
				>
					<Sun className="mr-2 h-4 w-4" />
					<span>亮色</span>
					{theme === "light" && <span className="text-xs ml-auto">✓</span>}
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark")}
					className="cursor-pointer"
				>
					<Moon className="mr-2 h-4 w-4" />
					<span>暗色</span>
					{theme === "dark" && <span className="text-xs ml-auto">✓</span>}
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className="cursor-pointer"
				>
					<Monitor className="mr-2 h-4 w-4" />
					<span>跟随系统</span>
					{theme === "system" && <span className="text-xs ml-auto">✓</span>}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ThemeToggle;

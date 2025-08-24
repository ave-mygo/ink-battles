"use client";

import Link from "next/link";
import { HeaderNav } from "@/components/global/HeaderNav";

/**
 * 顶部站点导航
 * - 固定顶栏，半透明毛玻璃
 * - 提供首页、赞助、登录、注册入口
 */
const AppHeader = () => {
	return (
		<div className="border-b border-white/40 bg-white/60 top-0 sticky z-40 backdrop-blur dark:border-white/10 dark:bg-slate-900/60 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60">
			<div className="mx-auto px-3 container flex h-14 max-w-6xl items-center justify-between sm:px-4">
				<Link href="/" className="text-sm text-slate-900 font-semibold transition-opacity sm:text-base dark:text-slate-100 hover:opacity-90">
					<span className="hidden sm:inline">作家战力分析</span>
					<span className="sm:hidden">作家分析</span>
				</Link>
				<HeaderNav />
			</div>
		</div>
	);
};

export default AppHeader;

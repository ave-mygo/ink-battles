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
		<div className="border-b border-white/40 bg-white/60 top-0 sticky z-40 backdrop-blur supports-[backdrop-filter]:bg-white/60">
			<div className="mx-auto px-4 container flex h-14 max-w-6xl items-center justify-between">
				<Link href="/" className="text-slate-900 font-semibold transition-opacity hover:opacity-90">
					作家战力分析
				</Link>
				<HeaderNav />
			</div>
		</div>
	);
};

export default AppHeader;

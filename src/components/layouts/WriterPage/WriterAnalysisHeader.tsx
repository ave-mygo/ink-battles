"use client";

import type { ComponentType } from "react";
import { Activity, ExternalLink, Heart, Info, MessageCircle, PenTool } from "lucide-react";
import Link from "next/link";

// 颜色样式映射表，解决 Tailwind JIT 编译问题并集中管理样式
const colorStyles: Record<"pink" | "green" | "purple" | "blue", string> = {
	pink: "text-pink-600 bg-pink-100 hover:bg-pink-200 hover:text-pink-700 dark:text-pink-300 dark:bg-pink-500/15 dark:hover:bg-pink-500/25",
	green: "text-green-600 bg-green-100 hover:bg-green-200 hover:text-green-700 dark:text-green-400 dark:bg-green-500/15 dark:hover:bg-green-500/25",
	purple: "text-purple-600 bg-purple-100 hover:bg-purple-200 hover:text-purple-700 dark:text-purple-400 dark:bg-purple-500/15 dark:hover:bg-purple-500/25",
	blue: "text-blue-600 bg-blue-100 hover:bg-blue-200 hover:text-blue-700 dark:text-blue-400 dark:bg-blue-500/15 dark:hover:bg-blue-500/25",
};

type Color = keyof typeof colorStyles;

export default function WriterAnalysisHeader() {
	const links: { href: string; icon: ComponentType<any>; text: string; color: Color; external?: boolean }[] = [
		{ href: "/sponsors", icon: Heart, text: "赞助支持我们", color: "pink" },
		{ href: "/status", icon: Activity, text: "前往状态页", color: "green" },
		{ href: "https://qm.qq.com/q/D6AK1DEQtq", icon: MessageCircle, text: "加入QQ群", color: "purple", external: true },
		{ href: "/about", icon: Info, text: "关于本项目", color: "blue" },
	];

	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex flex-col gap-4 items-center justify-center sm:flex-row sm:gap-6">
				{/* 优化了渐变色，并修正了类名 */}
				<div className="p-4 rounded-xl shadow-lg from-blue-500 to-purple-500 bg-linear-to-r dark:from-blue-700 dark:to-purple-700">
					<PenTool className="text-white h-8 w-8" />
				</div>
				<h1 className="text-3xl text-slate-800 leading-tight font-bold sm:text-4xl dark:text-slate-100">作家战力分析系统</h1>
			</div>
			<p className="text-lg text-slate-600 mx-auto mb-6 max-w-2xl dark:text-slate-300">
				基于AI技术的专业文本分析工具，为您的创作提供深度洞察
			</p>
			<div className="mx-auto max-w-3xl w-full">
				<div className="flex flex-wrap gap-4 justify-center">
					{links.map(link => (
						<Link
							key={link.href}
							href={link.href}
							target={link.external ? "_blank" : undefined}
							rel={link.external ? "noopener noreferrer" : undefined}
							// 使用映射表中的完整类名，确保样式能被正确生成
							className={`font-medium px-4 py-2.5 rounded-lg inline-flex grow gap-2 transition-colors duration-150 items-center justify-center sm:grow-0 ${colorStyles[link.color]}`}
						>
							<link.icon className="h-4 w-4" />
							<span>{link.text}</span>
							{(link.href.startsWith("http") || link.external) && <ExternalLink className="opacity-70 h-4 w-4" />}
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}

"use client";

import { Heart, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DAILY_CAP_GUEST, PER_REQUEST_GUEST, PER_REQUEST_LOGGED } from "@/lib/constants";

export default function TokenContent() {
	return (
		<div className="grid gap-6 md:grid-cols-2">
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center text-slate-800">
						当前使用规则
					</CardTitle>
					<CardDescription>了解系统的使用限制和策略</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm text-slate-700">
					<div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-lg">
						<h4 className="mb-2 font-semibold text-blue-800">未登录用户</h4>
						<ul className="space-y-1">
							<li>• 单次最多 <strong>{PER_REQUEST_GUEST.toLocaleString()}</strong> 字</li>
							<li>• 每日累计 <strong>{DAILY_CAP_GUEST.toLocaleString()}</strong> 字</li>
							<li>• 按浏览器指纹或 IP 任一计算</li>
						</ul>
					</div>
					
					<div className="border-l-4 border-green-400 bg-green-50 p-4 rounded-lg">
						<h4 className="mb-2 font-semibold text-green-800">已登录用户</h4>
						<ul className="space-y-1">
							<li>• 单次最多 <strong>{PER_REQUEST_LOGGED.toLocaleString()}</strong> 字</li>
							<li>• <strong>无每日累计上限</strong></li>
							<li>• 享受更流畅的体验</li>
						</ul>
					</div>
				</CardContent>
			</Card>

			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center text-slate-800">
						🚀 推荐操作
					</CardTitle>
					<CardDescription>获得更好的使用体验</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="leading-relaxed text-slate-700">
						为了获得更好的使用体验，我们建议您登录账户。如果您希望支持项目的持续发展，也欢迎前往赞助页面。
					</p>
					
					<div className="space-y-3">
						<Button asChild className="w-full" size="lg">
							<Link href="/signin" className="flex gap-2 items-center justify-center">
								<LogIn className="h-4 w-4" />
								登录账号
							</Link>
						</Button>
						
						<Button asChild variant="outline" className="w-full" size="lg">
							<Link href="/sponsors" className="flex gap-2 items-center justify-center">
								<Heart className="h-4 w-4" />
								前往赞助
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
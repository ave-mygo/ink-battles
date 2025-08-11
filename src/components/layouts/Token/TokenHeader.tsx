"use client";

import { AlertTriangle, Home, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TokenHeader() {
	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex gap-4 items-center justify-center">
				<div className="bg-gradient-to-br p-4 rounded-2xl flex shadow-xl items-center justify-center from-orange-500 to-red-600 via-yellow-500">
					<AlertTriangle className="text-white h-8 w-8" />
				</div>
				<h1 className="bg-gradient-to-r text-4xl text-transparent tracking-tight font-extrabold from-slate-700 to-slate-900 bg-clip-text drop-shadow-sm md:text-5xl">
					Token 管理
				</h1>
			</div>

			<Card className="bg-gradient-to-r mb-8 border-0 shadow-lg from-orange-50 to-red-50 via-yellow-50">
				<CardContent className="p-8">
					<p className="text-xl text-slate-700 leading-relaxed font-medium mb-6">
						Token 功能已下线，系统已全面切换为账号系统。
					</p>
					<div className="flex flex-wrap gap-4 justify-center">
						<Button
							asChild
							size="lg"
							className="bg-gradient-to-r text-white font-bold px-8 py-4 rounded-full shadow-lg transition-all duration-300 from-blue-500 to-indigo-500 hover:shadow-xl hover:scale-105 hover:from-blue-600 hover:to-indigo-600"
						>
							<Link href="/signin" className="flex gap-2 items-center">
								<LogIn className="h-5 w-5" />
								立即登录
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="font-semibold px-8 py-4 border-2 border-slate-300 rounded-full shadow-sm transition-all duration-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
						>
							<Link href="/" className="flex gap-2 items-center">
								<Home className="h-5 w-5" />
								返回首页
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

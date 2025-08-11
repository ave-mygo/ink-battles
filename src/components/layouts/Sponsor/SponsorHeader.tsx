"use client";

import { Heart, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function SponsorHeader() {
	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex gap-4 items-center justify-center">
				<div className="bg-gradient-to-br p-4 rounded-2xl flex shadow-xl items-center justify-center from-pink-500 to-rose-600 via-red-500">
					<Heart className="text-white h-8 w-8 animate-pulse" fill="currentColor" />
				</div>
				<h1 className="bg-gradient-to-r text-4xl text-transparent tracking-tight font-extrabold from-slate-700 to-slate-900 bg-clip-text drop-shadow-sm md:text-5xl">
					赞助者名单
				</h1>
			</div>

			<Card className="bg-gradient-to-r mb-8 border-0 shadow-lg from-rose-50 to-orange-50 via-pink-50">
				<CardContent className="p-8">
					<p className="text-xl text-slate-700 leading-relaxed font-medium mb-6">
						✨ 感谢所有赞助者的支持！您的每一份赞助都让我们更有动力持续改进产品。
					</p>
					<div className="flex flex-wrap gap-4 justify-center">
						<Button
							asChild
							size="lg"
							className="bg-gradient-to-r text-white font-bold px-8 py-4 rounded-full shadow-lg transition-all duration-300 from-red-500 to-pink-500 hover:shadow-xl hover:scale-105 hover:from-red-600 hover:to-pink-600"
						>
							<a
								href="https://afdian.com/a/tianxiang"
								target="_blank"
								rel="noopener noreferrer"
								className="flex gap-2 items-center"
							>
								<Heart className="h-5 w-5" fill="currentColor" />
								成为赞助者
							</a>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="font-semibold px-8 py-4 border-2 border-slate-300 rounded-full shadow-sm transition-all duration-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
						>
							<Link href="/signin" className="flex gap-2 items-center">
								<LogIn className="h-5 w-5" />
								立即登录
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

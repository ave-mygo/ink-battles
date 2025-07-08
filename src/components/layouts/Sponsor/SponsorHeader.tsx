"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SponsorHeader() {
	return (
		<div className="mb-8 text-center">
			<div className="mb-4"></div>
			<div className="mb-6 flex gap-4 items-center justify-center">
				<div className="p-4 rounded-xl bg-red-600">
					<Heart className="text-white h-8 w-8" />
				</div>
				<h1 className="text-4xl text-slate-800 font-bold">赞助者名单</h1>
			</div>

			<Card className="mb-8">
				<CardContent className="p-6">
					<p className="text-lg text-slate-600 mb-4">
						感谢所有赞助者的支持！您的赞助将帮助我们持续改进产品。
					</p>
					<div className="mt-2 flex flex-wrap gap-4 justify-center">
						<a
							href="https://afdian.com/a/tianxiang"
							target="_blank"
							rel="noopener noreferrer"
							className="bg-gradient-to-r text-white font-medium px-6 py-3 rounded-lg inline-flex min-w-[140px] shadow-sm transition-all duration-200 items-center justify-center from-red-500 to-pink-500 hover:shadow-md hover:from-red-600 hover:to-pink-600"
						>
							成为赞助者
						</a>
						<Link
							href="/"
							className="text-slate-700 font-medium px-6 py-3 border border-slate-200 rounded-lg bg-white inline-flex min-w-[140px] shadow-sm transition-all duration-200 items-center justify-center hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
						>
							返回首页
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

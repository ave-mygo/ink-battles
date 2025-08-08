"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SponsorHeader() {
	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex gap-4 items-center justify-center">
				<div className="bg-gradient-to-br p-5 rounded-2xl flex shadow-lg items-center justify-center from-pink-500 to-red-600">
					<Heart className="text-white h-10 w-10 animate-pulse" />
				</div>
				<h1 className="text-4xl text-slate-800 tracking-tight font-extrabold drop-shadow-sm md:text-5xl">
					赞助者名单
				</h1>
			</div>
      <Card className="bg-gradient-to-r mb-8 border-0 shadow-none from-yellow-50 to-pink-50">
				<CardContent className="p-6">
					<p className="text-xl text-slate-700 font-medium mb-4">
						感谢所有赞助者的支持！您的每一份赞助都让我们更有动力持续改进产品。
					</p>
          <div className="mt-2 flex flex-wrap gap-4 justify-center">
						<a
							href="https://afdian.com/a/tianxiang"
							target="_blank"
							rel="noopener noreferrer"
							className="bg-gradient-to-r text-lg text-white font-bold px-8 py-4 rounded-2xl inline-flex gap-2 min-w-[180px] shadow-lg transition-all duration-200 items-center justify-center from-red-500 to-pink-500 hover:shadow-xl hover:scale-105"
						>
							<Heart className="mr-2 h-6 w-6 -ml-2" />
							{" "}
							成为赞助者
						</a>
            <Link href="/signin" className="text-lg text-slate-700 font-semibold px-8 py-4 border border-slate-200 rounded-2xl bg-white inline-flex min-w-[140px] shadow-sm transition-all duration-200 items-center justify-center hover:border-slate-300 hover:bg-slate-50 hover:shadow-md">
              立即登录
            </Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

import type { Metadata } from "next";
import { ExternalLink, Globe, Home, LinkIcon, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
	return createPageMetadata({
		pathname: "/friends",
		title: "友情链接",
		description: "作家战力分析系统的友情链接与合作伙伴。",
		keywords: ["友情链接", "合作伙伴", "写作社区", "文学网站"],
	});
}

interface FriendLink {
	title: string;
	description: string;
	url: string;
}

const friends: FriendLink[] = [
	{
		title: "作家战力分析系统 (梦月版)",
		description: "提供更有趣味的分析结果",
		url: "https://ink-battles.yumetsuki.moe",
	},
	{
		title: "天翔TNXGの自留地",
		description: "明日尚未到来，希望凝于心上",
		url: "https://tnxg.top",
	},
];

export default function FriendsPage() {
	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				<div className="mb-8 text-center">
					<div className="mb-6 flex gap-4 items-center justify-center">
						<div className="p-4 rounded-2xl flex shadow-xl items-center justify-center from-orange-500 to-amber-600 via-yellow-500 bg-linear-to-br dark:from-orange-700 dark:to-amber-700 dark:via-yellow-600">
							<LinkIcon className="text-white h-8 w-8" />
						</div>
						<h1 className="text-4xl text-transparent tracking-tight font-extrabold from-slate-800 to-slate-950 bg-linear-to-r bg-clip-text drop-shadow-sm md:text-5xl dark:from-slate-100 dark:to-slate-300">
							友情链接
						</h1>
					</div>

					<Card className="mb-8 border-0 shadow-lg from-orange-50 to-yellow-50 via-amber-50 bg-linear-to-r dark:from-slate-800/60 dark:to-slate-900/40 dark:via-slate-800/40">
						<CardContent className="p-8">
							<p className="text-xl text-slate-700 leading-relaxed font-medium mb-6 dark:text-slate-200">
								感谢以下伙伴与社区的支持！欢迎优质网站加入友链合作。
							</p>
							<div className="flex flex-wrap gap-4 justify-center">
								<Button
									asChild
									size="lg"
									className="text-white font-bold px-8 py-4 rounded-full shadow-lg transition-all duration-300 from-orange-500 to-amber-500 bg-linear-to-r hover:shadow-xl hover:scale-105 dark:from-orange-600 dark:to-amber-600 hover:from-orange-600 hover:to-amber-600 dark:hover:from-orange-500 dark:hover:to-amber-500"
								>
									<Link
										href="https://github.com/ave-mygo/ink-battles/issues"
										target="_blank"
										className="flex gap-2 items-center"
									>
										<Plus className="h-5 w-5" />
										申请友链
									</Link>
								</Button>
								<Button
									asChild
									variant="outline"
									size="lg"
									className="font-semibold px-8 py-4 border-2 border-slate-300 rounded-full shadow-sm transition-all duration-300 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md dark:hover:bg-slate-800/60"
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

				{/* 友链卡片网格 - 紧凑设计 */}
				<div className="gap-4 grid lg:grid-cols-3 sm:grid-cols-2">
					{friends.map(friend => (
						<Link key={friend.url} href={friend.url} target="_blank" className="group block">
							<Card className="border border-slate-200/80 bg-white/90 shadow-sm transition-all duration-300 backdrop-blur-sm dark:border-slate-700/80 hover:border-orange-300 dark:bg-slate-800/80 hover:shadow-lg hover:scale-[1.02] dark:hover:border-orange-600">
								<CardContent className="p-4">
									<div className="flex gap-3 items-center">
										<div className="rounded-lg flex shrink-0 h-10 w-10 transition-colors items-center justify-center from-orange-100 to-amber-100 bg-linear-to-br dark:from-orange-900/40 dark:to-amber-900/40 group-hover:from-orange-200 group-hover:to-amber-200 dark:group-hover:from-orange-800/60 dark:group-hover:to-amber-800/60">
											<Globe className="text-orange-600 h-5 w-5 transition-colors dark:text-orange-400" />
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="text-slate-800 font-semibold truncate transition-colors dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400">
												{friend.title}
											</h3>
											<p className="text-sm text-slate-500 line-clamp-1 dark:text-slate-400">
												{friend.description}
											</p>
										</div>
										<ExternalLink className="text-slate-400 shrink-0 h-4 w-4 transition-colors group-hover:text-orange-500" />
									</div>
									<div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
										<span className="text-xs text-slate-400 flex gap-1 items-center dark:text-slate-500">
											<LinkIcon className="h-3 w-3" />
											{new URL(friend.url).hostname}
										</span>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}

					{/* 加入友链卡片 */}
					<Link
						href="https://github.com/ave-mygo/ink-battles/issues"
						target="_blank"
						className="group block"
					>
						<Card className="border-2 border-slate-300/80 border-dashed bg-slate-50/50 transition-all duration-300 backdrop-blur-sm dark:border-slate-600/80 hover:border-orange-400 dark:bg-slate-800/40 hover:bg-orange-50/30 dark:hover:border-orange-600 dark:hover:bg-orange-900/10">
							<CardContent className="p-4">
								<div className="flex gap-3 items-center">
									<div className="border-2 border-slate-300 rounded-lg border-dashed flex shrink-0 h-10 w-10 transition-colors items-center justify-center dark:border-slate-600 group-hover:border-orange-400 dark:group-hover:border-orange-600">
										<Plus className="text-slate-400 h-5 w-5 transition-colors group-hover:text-orange-500" />
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="text-slate-800 font-semibold transition-colors dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400">
											加入我们
										</h3>
										<p className="text-sm text-slate-500 line-clamp-1 dark:text-slate-400">
											欢迎优秀的写作工具、文学社区交换友链
										</p>
									</div>
									<ExternalLink className="text-slate-400 shrink-0 h-4 w-4 transition-colors group-hover:text-orange-500" />
								</div>
								<div className="mt-2 pt-2 border-t border-slate-200/50 border-dashed dark:border-slate-700/50">
									<span className="text-xs text-slate-400 flex gap-1 items-center dark:text-slate-500">
										<LinkIcon className="h-3 w-3" />
										点击提交申请
									</span>
								</div>
							</CardContent>
						</Card>
					</Link>
				</div>
			</div>
		</div>
	);
}

"use client";

import { Activity, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface Props {
	autoRefresh?: boolean;
	secondsLeft?: number;
	refreshing?: boolean;
	onToggleAuto?: () => void;
	onRefresh?: () => void;
}

export default function StatusHeader({
	autoRefresh = true,
	secondsLeft = 60,
	refreshing = false,
	onToggleAuto,
	onRefresh,
}: Props) {
	return (
		<div className="mb-8 text-center">
			<div className="mb-6 flex gap-4 items-center justify-center">
				<div className="p-4 rounded-2xl flex shadow-xl items-center justify-center from-emerald-500 to-cyan-600 via-teal-500 bg-linear-to-br dark:from-slate-700 dark:to-slate-900 dark:via-slate-800">
					<Activity className="text-white h-8 w-8 animate-pulse" />
				</div>
				<h1 className="text-4xl text-slate-900 tracking-tight font-extrabold md:text-5xl dark:text-slate-100">
					系统监控面板
				</h1>
			</div>

			<Card className="mb-8 border-0 shadow-lg from-emerald-50 to-cyan-50 via-teal-50 bg-linear-to-r dark:from-slate-800/60 dark:to-slate-900/40 dark:via-slate-800/50">
				<CardContent className="p-8">
					<div className="flex flex-wrap gap-4 justify-center">
						<Button
							asChild
							variant="ghost"
							size="sm"
							className="text-slate-700 px-4 py-2 border border-slate-200 rounded-full shadow-sm dark:text-slate-100 focus-visible:outline-none dark:border-slate-700 hover:bg-slate-50 focus-visible:ring-1 focus-visible:ring-slate-300 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-700"
						>
							<Link href="/" className="flex gap-2 items-center">
								<ArrowLeft className="h-5 w-5" />
								返回首页
							</Link>
						</Button>
						<div className="flex gap-3 items-center">
							<div className="text-sm text-slate-700 px-3 py-1.5 border border-slate-200 rounded-full bg-slate-100 flex gap-2 items-center dark:text-slate-200 dark:border-slate-700 dark:bg-slate-800/60">
								<Switch checked={autoRefresh} onCheckedChange={onToggleAuto} />
								<span className="leading-none">
									{autoRefresh
										? (
												<>
													自动刷新
													<span className="text-xs text-slate-700 font-medium ml-2 px-2 py-0.5 border border-slate-200 rounded-full bg-white inline-flex items-center dark:text-slate-200 dark:border-slate-700 dark:bg-slate-900/60">
														{Math.max(0, secondsLeft)}
														s
													</span>
												</>
											)
										: (
												"自动刷新已关闭"
											)}
								</span>
							</div>
							<Button
								size="sm"
								variant="default"
								onClick={onRefresh}
								className="text-white px-4 rounded-full bg-emerald-500 shadow-sm focus-visible:outline-none dark:bg-emerald-600 hover:bg-emerald-600 focus-visible:ring-1 focus-visible:ring-emerald-300 dark:hover:bg-emerald-500 dark:focus-visible:ring-emerald-800"
								disabled={refreshing}
							>
								<RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
								刷新
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

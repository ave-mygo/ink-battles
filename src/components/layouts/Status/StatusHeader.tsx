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
				<div className="bg-gradient-to-br p-4 rounded-2xl flex shadow-xl items-center justify-center from-emerald-500 to-cyan-600 via-teal-500">
					<Activity className="text-white h-8 w-8 animate-pulse" />
				</div>
				<h1 className="bg-gradient-to-r text-4xl text-transparent tracking-tight font-extrabold from-slate-700 to-slate-900 bg-clip-text drop-shadow-sm md:text-5xl">
					系统监控面板
				</h1>
			</div>

			<Card className="bg-gradient-to-r mb-8 border-0 shadow-lg from-emerald-50 to-cyan-50 via-teal-50">
				<CardContent className="p-8">
					<div className="flex flex-wrap gap-4 justify-center">
						<Button
							asChild
							variant="ghost"
							size="sm"
							className="text-slate-700 px-4 py-2 border border-slate-200 rounded-full shadow-sm hover:bg-slate-50"
						>
							<Link href="/" className="flex gap-2 items-center">
								<ArrowLeft className="h-5 w-5" />
								返回首页
							</Link>
						</Button>
						<div className="flex gap-3 items-center">
							<div className="text-sm text-slate-700 px-3 py-1.5 border border-slate-200 rounded-full bg-slate-100 flex gap-2 items-center">
								<Switch checked={autoRefresh} onCheckedChange={onToggleAuto} />
								<span className="leading-none">
									{autoRefresh
										? (
												<>
													自动刷新
													<span className="text-xs text-slate-700 font-medium ml-2 px-2 py-0.5 border border-slate-200 rounded-full bg-white inline-flex items-center">
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
								className="text-white px-4 rounded-full bg-emerald-500 shadow-sm hover:bg-emerald-600"
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

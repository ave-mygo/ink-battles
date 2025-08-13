"use client";

import type { UsageStats } from "./types";
import { CreditCard, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface UsageStatsCardProps {
	usageStats: UsageStats | null;
	statsLoading: boolean;
}

export const UsageStatsCard = ({ usageStats, statsLoading }: UsageStatsCardProps) => {
	return (
		<Card className="md:col-span-2">
			<CardHeader>
				<CardTitle className="flex items-center">
					<CreditCard className="mr-2 h-5 w-5" />
					使用统计
				</CardTitle>
				<CardDescription>您的服务使用情况</CardDescription>
			</CardHeader>
			<CardContent>
				{statsLoading
					? (
							<div className="space-y-4">
								<div className="space-y-2">
									<div className="rounded bg-gray-200 h-4 w-3/4 animate-pulse"></div>
									<div className="rounded bg-gray-200 h-2 w-full animate-pulse"></div>
									<div className="rounded bg-gray-200 h-3 w-1/2 animate-pulse"></div>
								</div>
								<div className="gap-4 grid grid-cols-2">
									<div className="p-3 rounded-lg bg-gray-200 h-16 animate-pulse"></div>
									<div className="p-3 rounded-lg bg-gray-200 h-16 animate-pulse"></div>
								</div>
							</div>
						)
					: usageStats
						? (
								<div className="space-y-4">
									{usageStats.advancedModelStats && (
										<>
											<div className="space-y-2">
												<div className="flex justify-between">
													<span className="text-sm flex gap-1 items-center">
														<Zap className="h-3 w-3" />
														高级模型调用
													</span>
													<span className="text-muted-foreground text-sm">今日已使用</span>
												</div>
												<Progress
													value={usageStats.advancedModelStats.dailyLimit > 0
														? (usageStats.advancedModelStats.todayUsed / usageStats.advancedModelStats.dailyLimit) * 100
														: 0}
													className="h-2"
												/>
												<div className="text-muted-foreground text-xs flex justify-between">
													<span>
														{usageStats.advancedModelStats.todayUsed}
														/
														{usageStats.advancedModelStats.dailyLimit}
													</span>
													<span>
														剩余
														{usageStats.advancedModelStats.remaining}
														{" "}
														次
													</span>
												</div>
											</div>
											<Separator />
										</>
									)}

									<div className="text-sm gap-4 grid grid-cols-3">
										<div className="bg-muted p-3 text-center rounded-lg">
											<div className="text-lg font-semibold">{usageStats.totalAnalysis.toLocaleString()}</div>
											<div className="text-muted-foreground">历史总分析</div>
										</div>
										<div className="bg-muted p-3 text-center rounded-lg">
											<div className="text-lg font-semibold">{usageStats.monthlyAnalysis.toLocaleString()}</div>
											<div className="text-muted-foreground">本月分析</div>
										</div>
										<div className="bg-muted p-3 text-center rounded-lg">
											<div className="text-lg font-semibold">{usageStats.todayAnalysis.toLocaleString()}</div>
											<div className="text-muted-foreground">今日分析</div>
										</div>
									</div>

									<Separator />

									<div className="text-sm gap-4 grid grid-cols-3">
										<div className="bg-muted/50 p-3 text-center rounded-lg">
											<div className="text-lg font-semibold">
												{(usageStats.totalTextLength / 1000).toFixed(1)}
												k
											</div>
											<div className="text-muted-foreground">历史总字数</div>
										</div>
										<div className="bg-muted/50 p-3 text-center rounded-lg">
											<div className="text-lg font-semibold">
												{(usageStats.monthlyTextLength / 1000).toFixed(1)}
												k
											</div>
											<div className="text-muted-foreground">本月字数</div>
										</div>
										<div className="bg-muted/50 p-3 text-center rounded-lg">
											<div className="text-lg font-semibold">
												{(usageStats.todayTextLength / 1000).toFixed(1)}
												k
											</div>
											<div className="text-muted-foreground">今日字数</div>
										</div>
									</div>
								</div>
							)
						: (
								<div className="text-muted-foreground py-8 text-center">
									<p>暂无使用数据</p>
								</div>
							)}
			</CardContent>
		</Card>
	);
};

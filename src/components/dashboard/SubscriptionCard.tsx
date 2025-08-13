"use client";

import type { UsageStats } from "./types";
import type { UserSubscriptionData } from "@/lib/subscription";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { calculateAdvancedModelCalls, MEMBERSHIP_TIERS } from "@/lib/constants";

interface SubscriptionCardProps {
	data: UserSubscriptionData;
	usageStats: UsageStats | null;
}

export const SubscriptionCard = ({ data, usageStats }: SubscriptionCardProps) => {
	const getSubscriptionStatusBadge = (status: string, isSubscribed: boolean) => {
		if (status === "loading") {
			return <Badge variant="secondary">加载中...</Badge>;
		}

		if (!isSubscribed) {
			return <Badge variant="secondary">未订阅</Badge>;
		}

		switch (status) {
			case "active":
				return <Badge className="bg-green-500">有效订阅</Badge>;
			case "expired":
				return <Badge variant="destructive">已过期</Badge>;
			case "cancelled":
				return <Badge variant="outline">已取消</Badge>;
			case "not_bound":
				return <Badge variant="secondary">未绑定爱发电</Badge>;
			case "api_error":
				return <Badge variant="destructive">API错误</Badge>;
			default:
				return <Badge variant="secondary">{status}</Badge>;
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center">
					<Crown className="mr-2 h-5 w-5" />
					订阅状态
				</CardTitle>
				<CardDescription>您的爱发电订阅信息</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">状态</span>
						{getSubscriptionStatusBadge(
							data.subscription.subscriptionStatus,
							data.subscription.isSubscribed,
						)}
					</div>

					{data.subscription.isSubscribed && (
						<>
							<Separator />
							{data.subscription.sponsorInfo && (
								<div className="space-y-3">
									<div className="space-y-3">
										<div className="flex justify-between">
											<span className="text-sm">累计支持金额</span>
											<span className="text-sm text-green-600 font-bold">
												¥
												{(data.subscription.sponsorInfo?.all_sum_amount || data.subscription.totalAmount).toFixed(2)}
											</span>
										</div>

										<div className="flex justify-between">
											<span className="text-sm">绑定方式</span>
											<span className="text-sm font-medium">
												{data.subscription.sponsorInfo.binding_method === "oauth" ? "OAuth授权" : "订单号绑定"}
											</span>
										</div>

										{data.subscription.sponsorInfo?.create_time && (
											<div className="flex justify-between">
												<span className="text-sm">首次赞助时间</span>
												<span className="text-sm font-medium">
													{new Date(data.subscription.sponsorInfo.create_time * 1000).toLocaleDateString()}
												</span>
											</div>
										)}

										{data.subscription.sponsorInfo?.last_pay_time && (
											<div className="flex justify-between">
												<span className="text-sm">最近赞助时间</span>
												<span className="text-sm font-medium">
													{new Date(data.subscription.sponsorInfo.last_pay_time * 1000).toLocaleDateString()}
												</span>
											</div>
										)}

										{data.subscription.sponsorInfo.bound_order_id && (
											<div className="flex justify-between">
												<span className="text-sm">绑定订单</span>
												<span className="text-sm font-medium font-mono">
													{data.subscription.sponsorInfo.bound_order_id}
												</span>
											</div>
										)}

										{data.subscription.currentPlan && (
											<div className="flex justify-between">
												<span className="text-sm">当前方案</span>
												<span className="text-sm font-medium">
													{data.subscription.currentPlan.name}
												</span>
											</div>
										)}
									</div>
									{(data.subscription.totalAmount || 0) > 0 && (() => {
										const donation = Number(data.subscription.totalAmount || 0);
										const nextTier = MEMBERSHIP_TIERS.find(t => t.minAmount > donation);

										return nextTier && nextTier.maxAmount !== Infinity && (
											<div className="pt-2 border-t space-y-2">
												<div className="space-y-1">
													<div className="text-muted-foreground text-xs flex justify-between">
														<span>
															下一档位 (¥
															{nextTier.minAmount}
															)
														</span>
														<span>
															{calculateAdvancedModelCalls(nextTier.minAmount)}
															{" "}
															次/日
														</span>
													</div>
													<Progress value={(donation / nextTier.minAmount) * 100} className="h-1.5" />
												</div>
											</div>
										);
									})()}
								</div>
							)}
						</>
					)}

					{usageStats?.limits && (
						<div className="pt-2 border-t">
							<h4 className="text-sm font-medium mb-2">当前限制</h4>
							<div className="text-muted-foreground text-xs space-y-1">
								<div className="flex justify-between">
									<span>单次分析上限:</span>
									<span>{usageStats.limits.perRequest ? `${usageStats.limits.perRequest.toLocaleString()} 字` : "无限制"}</span>
								</div>
								<div className="flex justify-between">
									<span>每日累计上限:</span>
									<span>{usageStats.limits.dailyLimit ? `${usageStats.limits.dailyLimit.toLocaleString()} 字` : "无限制"}</span>
								</div>
								{usageStats.advancedModelStats && (
									<div className="flex justify-between">
										<span>每日高级模型额度:</span>
										<span>
											{usageStats.advancedModelStats.dailyLimit.toLocaleString()}
											{" "}
											次/日
										</span>
									</div>
								)}
							</div>
						</div>
					)}

					{!data.subscription.isSubscribed && data.user.afdian_bound && (
						<div className="py-4 text-center">
							<p className="text-muted-foreground text-sm mb-3">
								您还没有订阅，订阅后可以享受更多功能
							</p>
							<Button
								size="sm"
								className="bg-orange-500 hover:bg-orange-600"
								onClick={() => window.open("https://afdian.com", "_blank")}
							>
								前往爱发电
							</Button>
						</div>
					)}

					{!data.user.afdian_bound && (
						<div className="py-4 text-center">
							<p className="text-muted-foreground text-sm mb-3">
								请先绑定爱发电账号以查看订阅状态
							</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

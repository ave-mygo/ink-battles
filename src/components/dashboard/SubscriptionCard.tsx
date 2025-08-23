"use client";

import type { UserSubscriptionData } from "@/types/billing/subscription";
import type { UsageStats } from "@/types/billing/usage";
import { CheckCircle, Copy, Crown, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MEMBERSHIP_TIERS } from "@/lib/constants";

interface SubscriptionCardProps {
	data: UserSubscriptionData;
	usageStats: UsageStats | null;
}

export const SubscriptionCard = ({ data, usageStats }: SubscriptionCardProps) => {
	const [orderRevealed, setOrderRevealed] = useState(false);
	const [copySuccess, setCopySuccess] = useState(false);

	const handleCopyOrder = async (orderId: string) => {
		try {
			await navigator.clipboard.writeText(orderId);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		} catch (err) {
			console.error("复制失败:", err);
		}
	};

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
											<div className="flex items-center justify-between">
												<span className="text-sm">绑定订单</span>
												<div className="flex gap-2 items-center">
													<div className="relative">
														<span
															className={`text-sm font-medium font-mono transition-all duration-300 ${
																orderRevealed ? "" : "blur-sm select-none"
															}`}
														>
															{data.subscription.sponsorInfo.bound_order_id}
														</span>
														{!orderRevealed && (
															<div className="flex items-center inset-0 justify-center absolute">
																<span className="text-muted-foreground bg-background text-xs px-1.5 py-0.5 border rounded">
																	已隐藏
																</span>
															</div>
														)}
													</div>
													<div className="flex gap-1">
														<Button
															variant="ghost"
															size="sm"
															className="p-0 h-6 w-6"
															onClick={() => setOrderRevealed(!orderRevealed)}
															title={orderRevealed ? "隐藏订单号" : "显示订单号"}
														>
															{orderRevealed
																? (
																		<EyeOff className="h-3.5 w-3.5" />
																	)
																: (
																		<Eye className="h-3.5 w-3.5" />
																	)}
														</Button>
														{orderRevealed && (
															<Button
																variant="ghost"
																size="sm"
																className="p-0 h-6 w-6"
																onClick={() => handleCopyOrder(data.subscription.sponsorInfo?.bound_order_id || "")}
																title={copySuccess ? "复制成功" : "复制订单号"}
																disabled={copySuccess}
															>
																{copySuccess
																	? (
																			<CheckCircle className="text-green-600 h-3.5 w-3.5" />
																		)
																	: (
																			<Copy className="h-3.5 w-3.5" />
																		)}
															</Button>
														)}
													</div>
												</div>
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
										const tierValues = Object.values(MEMBERSHIP_TIERS);
										const nextTier = tierValues.find((t: any) => t.minAmount > donation);

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
															{(nextTier.discount * 100).toFixed(0)}
															%折扣
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
										<span>高级模型余额:</span>
										<span>
											赠送
											{usageStats.advancedModelStats.grantCallsRemaining || 0}
											次 + 付费
											{usageStats.advancedModelStats.paidCallsRemaining || 0}
											次
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

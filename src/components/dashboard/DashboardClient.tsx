"use client";

import type { UserType } from "@/lib/constants";
import type { UserSubscriptionData } from "@/lib/subscription";
import { CreditCard, Crown, Link2, RefreshCw, Unlink, User, Zap } from "lucide-react";
import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
// Removed UserTierInfo card; limits moved into subscription card
import { calculateAdvancedModelCalls, MEMBERSHIP_TIERS } from "@/lib/constants";

interface UsageStats {
	userType: UserType;
	totalAnalysis: number;
	monthlyAnalysis: number;
	todayAnalysis: number;
	totalTextLength: number;
	monthlyTextLength: number;
	todayTextLength: number;
	advancedModelStats?: {
		dailyLimit: number;
		todayUsed: number;
		remaining: number;
	};
	limits: {
		perRequest: number | null;
		dailyLimit: number | null;
	};
}

interface OAuthConfig {
	authUrl: string;
	state: string;
}

interface DashboardClientProps {
	initialData: UserSubscriptionData;
	oauthConfig: OAuthConfig;
}

export const DashboardClient = ({ initialData, oauthConfig }: DashboardClientProps) => {
	// 批量初始化状态
	const [data, setData] = useState<UserSubscriptionData>(initialData);
	const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
	const [loading, setLoading] = useState(false);
	const [statsLoading, setStatsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [bindLoading, setBindLoading] = useState(false);
	const [orderIdDialogOpen, setOrderIdDialogOpen] = useState(false);
	const [orderId, setOrderId] = useState("");
	const [orderBindLoading, setOrderBindLoading] = useState(false);

	const refreshData = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await fetch("/api/user/subscription");

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "获取数据失败");
			}

			const result = await response.json();
			setData(result);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "未知错误";
			setError(errorMessage);
			console.error("刷新订阅数据失败:", err);
		} finally {
			setLoading(false);
		}
	};

	const refreshUsageStats = async () => {
		try {
			setStatsLoading(true);

			const response = await fetch("/api/user/usage-stats");

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "获取使用统计失败");
			}

			const result = await response.json();
			setUsageStats(result);
		} catch (err) {
			console.error("刷新使用统计失败:", err);
		} finally {
			setStatsLoading(false);
		}
	};

	// 如果初始数据的订阅状态是loading，自动刷新获取最新数据
	React.useEffect(() => {
		// 加载使用统计数据
		refreshUsageStats();

		if (initialData.subscription.subscriptionStatus === "loading") {
			refreshData();
		}
	}, []);

	// 并行获取数据以提升性能
	const handleRefreshAll = async () => {
		setLoading(true);
		setStatsLoading(true);

		try {
			await Promise.all([refreshData(), refreshUsageStats()]);
		} catch (err) {
			console.error("批量刷新数据失败:", err);
		} finally {
			// 由于各个函数内部会设置对应的loading状态，这里不需要额外设置
		}
	};

	const handleAfdianAuth = () => {
		// 将服务端生成的 state 存储到 sessionStorage 以便回调时验证
		sessionStorage.setItem("oauth_state", oauthConfig.state);

		// 直接使用服务端生成的OAuth URL
		window.location.href = oauthConfig.authUrl;
	};

	const handleUnbindAfdian = async () => {
		try {
			setBindLoading(true);

			const response = await fetch("/api/user/bind", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ action: "unbind_afdian" }),
			});

			if (!response.ok) {
				throw new Error("解绑失败");
			}

			await refreshData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "解绑失败");
		} finally {
			setBindLoading(false);
		}
	};

	const handleOrderIdBind = async () => {
		if (!orderId.trim()) {
			setError("请输入订单号");
			return;
		}

		try {
			setOrderBindLoading(true);
			setError(null);

			const response = await fetch("/api/user/bind-order", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ orderId: orderId.trim() }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "绑定失败");
			}

			setOrderIdDialogOpen(false);
			setOrderId("");
			await refreshData();
		} catch (err) {
			setError(err instanceof Error ? err.message : "绑定失败");
		} finally {
			setOrderBindLoading(false);
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

	if (error) {
		return (
			<div className="mx-auto p-6 container max-w-4xl">
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
				<div className="mt-4 text-center">
					<Button onClick={refreshData}>重试</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto p-6 container max-w-4xl">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-3xl font-bold">用户控制台</h1>
				<Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={loading || statsLoading}>
					<RefreshCw className={`mr-2 h-4 w-4 ${(loading || statsLoading) ? "animate-spin" : ""}`} />
					刷新
				</Button>
			</div>

			{/* 用户分级信息卡片已移除，信息整合至订阅状态卡片 */}

			<div className="gap-6 grid md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<User className="mr-2 h-5 w-5" />
							用户信息
						</CardTitle>
						<CardDescription>您的账户基本信息</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* 用户头像和基本信息 */}
						<div className="flex items-start space-x-4">
							{(() => {
								const displayName = data.user.username || data.user.email || "用户";
								const initial = (displayName[0] || "?").toUpperCase();
								// 优先使用爱发电头像，其次使用用户头像
								const avatarSrc = data.user.afdian_avatar || data.user.avatar;
								return (
									<>
										<Avatar className="flex-shrink-0 h-16 w-16">
											<AvatarImage src={avatarSrc} alt={displayName} />
											<AvatarFallback className="text-lg">{initial}</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<h3 className="text-xl font-semibold truncate">{displayName}</h3>
											<p className="text-muted-foreground text-sm truncate">{data.user.email || "未设置邮箱"}</p>
											{data.user.afdian_bound && data.user.afdian_username && (
												<div className="mt-1 flex items-center space-x-2">
													<div className="rounded-full bg-green-500 h-2 w-2"></div>
													<p className="text-muted-foreground text-xs">
														爱发电: @
														{data.user.afdian_username}
													</p>
												</div>
											)}
										</div>
									</>
								);
							})()}
						</div>

						<Separator />

						{/* 爱发电绑定状态 */}
						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Link2 className="text-muted-foreground h-4 w-4" />
								<span className="text-sm font-medium">爱发电账号</span>
							</div>

							{data.user.afdian_bound
								? (
										<div className="p-3 border border-green-200 rounded-lg bg-green-50">
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<div className="mb-1 flex items-center space-x-2">
														<div className="rounded-full bg-green-500 h-2 w-2"></div>
														<p className="text-sm text-green-800 font-medium">已绑定</p>
													</div>
													<div className="text-xs text-green-600 space-y-1">
														{data.user.afdian_username && (
															<p>
																用户名: @
																{data.user.afdian_username}
															</p>
														)}
														{data.user.afdian_user_id && (
															<p>
																ID:
																{data.user.afdian_user_id}
															</p>
														)}
													</div>
												</div>
												<Button
													size="sm"
													variant="outline"
													onClick={handleUnbindAfdian}
													disabled={bindLoading}
													className="text-green-700 ml-3 border-green-300 hover:bg-green-100"
												>
													<Unlink className="mr-1 h-3 w-3" />
													解绑
												</Button>
											</div>
										</div>
									)
								: (
										<div className="space-y-3">
											<div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
												<div className="flex items-center space-x-3">
													<div className="rounded-full bg-orange-500 h-2 w-2"></div>
													<div>
														<p className="text-sm text-orange-800 font-medium">未绑定爱发电账号</p>
														<p className="text-xs text-orange-600">绑定后可享受订阅功能</p>
													</div>
												</div>
											</div>

											<div className="flex gap-2">
												<Button
													size="sm"
													onClick={handleAfdianAuth}
													className="text-white bg-orange-500 flex-1 hover:bg-orange-600"
												>
													<Link2 className="mr-1 h-3 w-3" />
													OAuth绑定
												</Button>

												<Dialog open={orderIdDialogOpen} onOpenChange={setOrderIdDialogOpen}>
													<DialogTrigger asChild>
														<Button
															size="sm"
															variant="outline"
															className="flex-1"
														>
															订单号绑定
														</Button>
													</DialogTrigger>
													<DialogContent className="sm:max-w-[425px]">
														<DialogHeader>
															<DialogTitle>通过订单号绑定爱发电账号</DialogTitle>
															<DialogDescription>
																请输入您在爱发电的任意一笔订单号，我们将通过订单号查询并绑定您的爱发电账号。
															</DialogDescription>
														</DialogHeader>
														<div className="py-4 gap-4 grid">
															<div className="gap-2 grid">
																<Label htmlFor="order-id">订单号</Label>
																<Input
																	id="order-id"
																	placeholder="请输入爱发电订单号"
																	value={orderId}
																	onChange={e => setOrderId(e.target.value)}
																	disabled={orderBindLoading}
																/>
															</div>
															{error && (
																<Alert variant="destructive">
																	<AlertDescription>{error}</AlertDescription>
																</Alert>
															)}
														</div>
														<div className="flex justify-end space-x-2">
															<Button
																variant="outline"
																onClick={() => {
																	setOrderIdDialogOpen(false);
																	setOrderId("");
																	setError(null);
																}}
																disabled={orderBindLoading}
															>
																取消
															</Button>
															<Button
																onClick={handleOrderIdBind}
																disabled={orderBindLoading || !orderId.trim()}
															>
																{orderBindLoading ? "绑定中..." : "确认绑定"}
															</Button>
														</div>
													</DialogContent>
												</Dialog>
											</div>
										</div>
									)}
						</div>
					</CardContent>
				</Card>

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
											{/* 高级模型使用情况 */}
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

											{/* 基础统计 */}
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

											{/* 文本长度统计 */}
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
			</div>
		</div>
	);
};

export default DashboardClient;

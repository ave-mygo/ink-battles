"use client";

import process from "node:process";
import { CreditCard, Crown, ExternalLink, Link2, RefreshCw, Unlink, User } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface UserInfo {
	id: string;
	username: string;
	email: string;
	avatar: string;
	afdian_user_id?: string;
	afdian_bound: boolean;
	afdian_username?: string;
}

interface SubscriptionInfo {
	isSubscribed: boolean;
	sponsorInfo: any;
	totalAmount: number;
	currentPlan: any;
	subscriptionStatus: string;
}

interface DashboardData {
	user: UserInfo;
	subscription: SubscriptionInfo;
}

interface DashboardClientProps {
	initialData: DashboardData;
}

export const DashboardClient = ({ initialData }: DashboardClientProps) => {
	const [data, setData] = useState<DashboardData>(initialData);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [bindLoading, setBindLoading] = useState(false);

	const refreshData = async () => {
		try {
			setLoading(true);

			const response = await fetch("/api/user/subscription");

			if (!response.ok) {
				throw new Error("获取数据失败");
			}

			const result = await response.json();
			setData(result);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "未知错误");
		} finally {
			setLoading(false);
		}
	};

	const handleAfdianAuth = () => {
		const clientId = process.env.NEXT_PUBLIC_AFDIAN_CLIENT_ID;
		const redirectUri = process.env.NEXT_PUBLIC_AFDIAN_REDIRECT_URI;
		const scope = "basic";
		const state = Math.random().toString(36).substring(2);

		const authUrl = `https://afdian.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;
		window.location.href = authUrl;
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

	const getSubscriptionStatusBadge = (status: string, isSubscribed: boolean) => {
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
				<Button variant="outline" size="sm" onClick={refreshData} disabled={loading}>
					<RefreshCw className="mr-2 h-4 w-4" />
					刷新
				</Button>
			</div>

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
								return (
									<>
										<Avatar className="flex-shrink-0 h-16 w-16">
											<AvatarImage src={data.user.avatar} alt={displayName} />
											<AvatarFallback className="text-lg">{initial}</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<h3 className="text-xl font-semibold truncate">{displayName}</h3>
											<p className="text-muted-foreground text-sm truncate">{data.user.email || "未设置邮箱"}</p>
											{data.user.afdian_user_id && (
												<p className="text-muted-foreground text-xs mt-1">
													爱发电ID:
													{" "}
													{data.user.afdian_user_id}
												</p>
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
										<div className="p-3 border border-green-200 rounded-lg bg-green-50 flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className="rounded-full bg-green-500 h-2 w-2"></div>
												<div>
													<p className="text-sm text-green-800 font-medium">已绑定爱发电账号</p>
													{data.user.afdian_username && (
														<p className="text-xs text-green-600">
															@
															{data.user.afdian_username}
														</p>
													)}
												</div>
											</div>
											<Button
												size="sm"
												variant="outline"
												onClick={handleUnbindAfdian}
												disabled={bindLoading}
												className="text-green-700 border-green-300 hover:bg-green-100"
											>
												<Unlink className="mr-1 h-3 w-3" />
												解绑
											</Button>
										</div>
									)
								: (
										<div className="p-3 border border-orange-200 rounded-lg bg-orange-50 flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className="rounded-full bg-orange-500 h-2 w-2"></div>
												<div>
													<p className="text-sm text-orange-800 font-medium">未绑定爱发电账号</p>
													<p className="text-xs text-orange-600">绑定后可享受订阅功能</p>
												</div>
											</div>
											<Button
												size="sm"
												onClick={handleAfdianAuth}
												className="text-white bg-orange-500 hover:bg-orange-600"
											>
												<Link2 className="mr-1 h-3 w-3" />
												立即绑定
											</Button>
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
									<div className="space-y-2">
										<div className="flex justify-between">
											<span className="text-sm">累计支持金额</span>
											<span className="text-sm font-medium">
												¥
												{(data.subscription.totalAmount / 100).toFixed(2)}
											</span>
										</div>

										{data.subscription.currentPlan && (
											<div className="flex justify-between">
												<span className="text-sm">当前方案</span>
												<span className="text-sm font-medium">
													{data.subscription.currentPlan.name}
												</span>
											</div>
										)}
									</div>
								</>
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
										<ExternalLink className="mr-2 h-4 w-4" />
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

				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center">
							<CreditCard className="mr-2 h-5 w-5" />
							使用统计
						</CardTitle>
						<CardDescription>您的服务使用情况</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="space-y-2">
								<div className="flex justify-between">
									<span className="text-sm">AI 分析次数</span>
									<span className="text-muted-foreground text-sm">本月已使用</span>
								</div>
								<Progress value={65} className="h-2" />
								<div className="text-muted-foreground text-xs flex justify-between">
									<span>65/100</span>
									<span>剩余 35 次</span>
								</div>
							</div>

							<Separator />

							<div className="text-sm gap-4 grid grid-cols-2">
								<div className="bg-muted p-3 text-center rounded-lg">
									<div className="text-lg font-semibold">156</div>
									<div className="text-muted-foreground">历史总分析</div>
								</div>
								<div className="bg-muted p-3 text-center rounded-lg">
									<div className="text-lg font-semibold">28</div>
									<div className="text-muted-foreground">本月分析</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default DashboardClient;

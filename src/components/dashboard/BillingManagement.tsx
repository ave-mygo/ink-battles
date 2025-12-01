"use client";

import type { SerializedUserBilling } from "@/types/database/user_billing";
import { AlertCircle, Calendar, Coins, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getBillingInfo } from "@/app/actions/billing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 计费管理组件
 * 展示用户的会员等级、累计消费、调用次数余额等信息
 */
export default function BillingManagement() {
	const [loading, setLoading] = useState(true);
	const [billing, setBilling] = useState<SerializedUserBilling | null>(null);
	const [memberName, setMemberName] = useState("");
	const [discount, setDiscount] = useState(0);
	const [paidCallPrice, setPaidCallPrice] = useState(0);

	const loadBillingInfo = useCallback(async () => {
		setLoading(true);
		const result = await getBillingInfo();
		if (result.success && result.data) {
			setBilling(result.data.billing);
			setMemberName(result.data.memberName);
			setDiscount(result.data.discount);
			setPaidCallPrice(result.data.paidCallPrice);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		let isMounted = true;

		const fetchData = async () => {
			const result = await getBillingInfo();
			if (isMounted && result.success && result.data) {
				setBilling(result.data.billing);
				setMemberName(result.data.memberName);
				setDiscount(result.data.discount);
				setPaidCallPrice(result.data.paidCallPrice);
			}
			if (isMounted) {
				setLoading(false);
			}
		};

		void fetchData();

		return () => {
			isMounted = false;
		};
	}, []);

	if (loading) {
		return (
			<div className="space-y-4">
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="mt-2 h-4 w-48" />
					</CardHeader>
					<CardContent>
						<div className="gap-4 grid grid-cols-1 md:grid-cols-3">
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-8 w-24" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-8 w-24" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-8 w-24" />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
					<CardHeader>
						<Skeleton className="h-6 w-32" />
						<Skeleton className="mt-2 h-4 w-48" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-24 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!billing) {
		return (
			<Card className="border-0 border-red-100 bg-white/80 shadow-lg backdrop-blur-sm dark:border-red-900/20">
				<CardContent className="py-10 text-center flex flex-col items-center justify-center space-y-4">
					<div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
						<AlertCircle className="text-red-600 h-8 w-8 dark:text-red-400" />
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">无法获取计费信息</h3>
						<p className="text-muted-foreground text-sm mx-auto max-w-xs">
							获取您的会员权益和余额信息时出现问题，请检查网络连接或稍后重试。
						</p>
					</div>
					<Button
						variant="outline"
						onClick={loadBillingInfo}
						className="gap-2"
					>
						<RefreshCw className="h-4 w-4" />
						重新加载
					</Button>
				</CardContent>
			</Card>
		);
	}

	const totalCalls = billing.grantCallsBalance + billing.paidCallsBalance;
	const nextRefreshDate = new Date(billing.lastGrantRefresh);
	nextRefreshDate.setMonth(nextRefreshDate.getMonth() + 1);
	nextRefreshDate.setDate(1);

	return (
		<div className="space-y-4">
			{/* 会员等级卡片 */}
			<Card className="border-0 bg-white/80 shadow-lg transition-all backdrop-blur-sm hover:shadow-xl">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex gap-2 items-center">
								<Sparkles className="text-blue-600 h-5 w-5" />
								会员等级
							</CardTitle>
							<CardDescription>当前等级及权益</CardDescription>
						</div>
						<Badge variant="outline" className="text-lg px-4 py-2">
							{memberName}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="gap-4 grid grid-cols-1 md:grid-cols-3">
						<div className="space-y-2">
							<div className="text-muted-foreground text-sm flex gap-2 items-center">
								<TrendingUp className="h-4 w-4" />
								累计消费
							</div>
							<div className="text-2xl font-bold">
								¥
								{billing.totalAmount.toFixed(2)}
							</div>
						</div>
						<div className="space-y-2">
							<div className="text-muted-foreground text-sm flex gap-2 items-center">
								<Coins className="h-4 w-4" />
								付费折扣
							</div>
							<div className="text-2xl font-bold">
								{(discount * 100).toFixed(0)}
								%
							</div>
						</div>
						<div className="space-y-2">
							<div className="text-muted-foreground text-sm flex gap-2 items-center">
								<Coins className="h-4 w-4" />
								付费单价
							</div>
							<div className="text-2xl font-bold">
								¥
								{paidCallPrice.toFixed(2)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 调用次数卡片 */}
			<Card className="border-0 bg-white/80 shadow-lg transition-all backdrop-blur-sm hover:shadow-xl">
				<CardHeader>
					<CardTitle>调用次数余额</CardTitle>
					<CardDescription>高级模型分析可用次数</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* 总计 */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">总可用次数</span>
							<span className="text-2xl text-blue-600 font-bold">{totalCalls}</span>
						</div>
						<Progress value={totalCalls > 0 ? 100 : 0} className="h-2" />
					</div>

					{/* 详细分类 */}
					<div className="gap-4 grid grid-cols-1 md:grid-cols-2">
						<div className="p-4 border rounded-lg space-y-2">
							<div className="text-muted-foreground text-sm">每月赠送</div>
							<div className="text-xl text-green-600 font-bold">{billing.grantCallsBalance}</div>
							<div className="text-muted-foreground text-xs flex gap-1 items-center">
								<Calendar className="h-3 w-3" />
								下次刷新:
								{" "}
								{nextRefreshDate.toLocaleDateString("zh-CN")}
							</div>
						</div>
						<div className="p-4 border rounded-lg space-y-2">
							<div className="text-muted-foreground text-sm">付费购买</div>
							<div className="text-xl text-purple-600 font-bold">{billing.paidCallsBalance}</div>
							<div className="text-muted-foreground text-xs">永不过期</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

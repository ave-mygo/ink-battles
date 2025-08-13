"use client";

import type { UserSubscriptionData } from "@/lib/subscription";
import { RefreshCw } from "lucide-react";
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUsageStats } from "./hooks/useUsageStats";
import { useUserData } from "./hooks/useUserData";
import { SubscriptionCard } from "./SubscriptionCard";
import { UsageStatsCard } from "./UsageStatsCard";
import { UserInfoCard } from "./UserInfoCard";

interface OAuthConfig {
	authUrl: string;
	state: string;
}

interface DashboardClientProps {
	initialData: UserSubscriptionData;
	oauthConfig: OAuthConfig;
}

export const DashboardClient = ({ initialData, oauthConfig }: DashboardClientProps) => {
	const { usageStats, statsLoading, refreshUsageStats } = useUsageStats();
	const {
		data,
		loading,
		error,
		bindLoading,
		orderIdDialogOpen,
		orderId,
		orderBindLoading,
		refreshData,
		handleUnbindAfdian,
		handleOrderIdBind,
		setOrderIdDialogOpen,
		setOrderId,
		clearError,
	} = useUserData(initialData);

	const handleAfdianAuth = () => {
		// 将服务端生成的 state 存储到 sessionStorage 以便回调时验证
		sessionStorage.setItem("oauth_state", oauthConfig.state);
		// 直接使用服务端生成的OAuth URL
		window.location.href = oauthConfig.authUrl;
	};

	// 并行获取数据以提升性能
	const handleRefreshAll = async () => {
		await Promise.all([refreshData(), refreshUsageStats()]);
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

			<div className="gap-6 grid md:grid-cols-2">
				<UserInfoCard
					data={data}
					bindLoading={bindLoading}
					orderIdDialogOpen={orderIdDialogOpen}
					orderId={orderId}
					orderBindLoading={orderBindLoading}
					error={error}
					onUnbindAfdian={handleUnbindAfdian}
					onAfdianAuth={handleAfdianAuth}
					onOrderIdDialogOpenChange={setOrderIdDialogOpen}
					onOrderIdChange={setOrderId}
					onOrderIdBind={handleOrderIdBind}
					onErrorClear={clearError}
				/>

				<SubscriptionCard data={data} usageStats={usageStats} />

				<UsageStatsCard usageStats={usageStats} statsLoading={statsLoading} />
			</div>
		</div>
	);
};

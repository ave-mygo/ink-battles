"use client";

import type { AnalysisHistoryItem } from "@/lib/analysis-history";
import type { UserSubscriptionData } from "@/lib/subscription";
import { RefreshCw } from "lucide-react";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cleanupOAuthParams, isQQOAuthCallback, parseQQCallback } from "@/utils/qq-oauth";
import { AccountBinding } from "./AccountBinding";
import { HistoryCard } from "./HistoryCard";
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
	initialHistoryData: AnalysisHistoryItem[];
}

export const DashboardClient = ({ initialData, oauthConfig, initialHistoryData }: DashboardClientProps) => {
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

	const handleQQBind = async (code: string) => {
		try {
			const res = await fetch("/api/auth/bind-qq", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code }),
			});

			const data = await res.json();

			if (data.success) {
				toast.success("QQ绑定成功");
				cleanupOAuthParams();
				// 清理URL参数
				const url = new URL(window.location.href);
				url.searchParams.delete("action");
				window.history.replaceState({}, document.title, url.toString());
				// 刷新用户数据
				refreshData();
			} else {
				toast.error(data.message || "QQ绑定失败");
				cleanupOAuthParams();
			}
		} catch (error) {
			console.error(error);
			toast.error("QQ绑定失败，请稍后再试");
			cleanupOAuthParams();
		}
	};

	// 处理QQ绑定回调
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const action = urlParams.get("action");

		if (action === "bind_qq" && isQQOAuthCallback()) {
			const { code, error, errorDescription } = parseQQCallback();

			if (error) {
				toast.error(`QQ绑定失败: ${errorDescription || error}`);
				cleanupOAuthParams();
				// 清理URL参数
				const url = new URL(window.location.href);
				url.searchParams.delete("action");
				window.history.replaceState({}, document.title, url.toString());
				return;
			}

			if (code) {
				handleQQBind(code);
			}
		}
	}, []);

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
			<div className="mx-auto p-4 container max-w-4xl sm:p-6">
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
		<div className="mx-auto p-4 container max-w-4xl sm:p-6 min-w-0 w-full">
			<div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
				<h1 className="text-2xl font-bold sm:text-3xl">用户控制台</h1>
				<Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={loading || statsLoading} className="self-start sm:self-auto">
					<RefreshCw className={`mr-2 h-4 w-4 ${(loading || statsLoading) ? "animate-spin" : ""}`} />
					刷新
				</Button>
			</div>

			<div className="gap-4 grid sm:gap-6 lg:grid-cols-2 w-full">
				{/* 添加 min-w-0 给每个卡片防止溢出 */}
				<div className="min-w-0">
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
				</div>

				<div className="min-w-0">
					<SubscriptionCard data={data} usageStats={usageStats} />
				</div>

				<div className="min-w-0">
					<AccountBinding
						userInfo={{
							email: data.user.email,
							qqOpenid: data.user.qqOpenid,
							nickname: data.user.username,
							avatar: data.user.avatar,
							loginMethod: data.user.loginMethod,
						}}
						onUpdate={refreshData}
					/>
				</div>

				<div className="min-w-0">
					<HistoryCard initialData={initialHistoryData} />
				</div>

				<div className="min-w-0">
					<UsageStatsCard usageStats={usageStats} statsLoading={statsLoading} />
				</div>
			</div>
		</div>
	);
};

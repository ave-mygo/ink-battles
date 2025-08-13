"use client";

import type { UserSubscriptionData } from "@/lib/subscription";
import { useCallback, useState } from "react";

export const useUserData = (initialData: UserSubscriptionData) => {
	const [data, setData] = useState<UserSubscriptionData>(initialData);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [bindLoading, setBindLoading] = useState(false);
	const [orderIdDialogOpen, setOrderIdDialogOpen] = useState(false);
	const [orderId, setOrderId] = useState("");
	const [orderBindLoading, setOrderBindLoading] = useState(false);

	const refreshData = useCallback(async () => {
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
	}, []);

	const handleUnbindAfdian = useCallback(async () => {
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
	}, [refreshData]);

	const handleOrderIdBind = useCallback(async () => {
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
	}, [orderId, refreshData]);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
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
	};
};

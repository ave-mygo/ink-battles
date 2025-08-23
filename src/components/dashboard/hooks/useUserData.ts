"use client";

import type { UserSubscriptionData } from "@/lib/subscription";
import { useCallback, useState } from "react";

export const useUserData = (initialData: UserSubscriptionData) => {
	const [data, setData] = useState<UserSubscriptionData>(initialData);
	const [loading, setLoading] = useState(false);
	const [bindLoading, setBindLoading] = useState(false);

	const refreshData = useCallback(async () => {
		try {
			setLoading(true);

			const response = await fetch("/api/user/subscription");

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || "获取数据失败");
			}

			const result = await response.json();
			setData(result);
		} catch (err) {
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
			console.error("解绑失败:", err);
		} finally {
			setBindLoading(false);
		}
	}, [refreshData]);

	return {
		data,
		loading,
		bindLoading,
		refreshData,
		handleUnbindAfdian,
	};
};

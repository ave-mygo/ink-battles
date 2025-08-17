"use client";

import type { UsageStats } from "../types";
import { useCallback, useEffect, useState } from "react";

export const useUsageStats = (autoLoad = true) => {
	const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(autoLoad); // 如果自动加载，初始状态为loading

	const refreshUsageStats = useCallback(async () => {
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
	}, []);

	useEffect(() => {
		if (autoLoad) {
			refreshUsageStats();
		}
	}, [refreshUsageStats, autoLoad]);

	return {
		usageStats,
		statsLoading,
		refreshUsageStats,
	};
};

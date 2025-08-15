"use client";

import { useCallback, useEffect, useState } from "react";
import type { UsageStats } from "../types";

export const useUsageStats = () => {
	const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(false);

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
		refreshUsageStats();
	}, [refreshUsageStats]);

	return {
		usageStats,
		statsLoading,
		refreshUsageStats,
	};
};

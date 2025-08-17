import type { NextRequest } from "next/server";
import process from "node:process";
import { aiResultCache, userSessionCache } from "@/lib/memory-cache";

// 内存统计API端点
export async function GET(_request: NextRequest) {
	try {
		// 获取Node.js进程内存统计
		const processMemory = process.memoryUsage();

		// 获取缓存统计
		const aiCacheStats = aiResultCache.getStats();
		const sessionCacheStats = userSessionCache.getStats();

		// 计算内存使用百分比
		const totalHeapUsed = processMemory.heapUsed;
		const totalHeapSize = processMemory.heapTotal;
		const heapUsagePercent = (totalHeapUsed / totalHeapSize) * 100;

		// 检查内存压力
		const memoryPressure = heapUsagePercent > 80 ? "high" : heapUsagePercent > 60 ? "medium" : "low";

		const stats = {
			timestamp: new Date().toISOString(),
			process: {
				heapUsed: Math.round(processMemory.heapUsed / 1024 / 1024), // MB
				heapTotal: Math.round(processMemory.heapTotal / 1024 / 1024), // MB
				external: Math.round(processMemory.external / 1024 / 1024), // MB
				rss: Math.round(processMemory.rss / 1024 / 1024), // MB
				heapUsagePercent: Math.round(heapUsagePercent),
				memoryPressure,
			},
			caches: {
				aiResults: {
					...aiCacheStats,
					memoryUsage: Math.round(aiCacheStats.memoryUsage / 1024 / 1024), // MB
					maxSize: Math.round(aiCacheStats.maxSize / 1024 / 1024), // MB
					hitRate: Math.round(aiCacheStats.hitRate * 100) / 100, // 保留2位小数
				},
				userSessions: {
					...sessionCacheStats,
					memoryUsage: Math.round(sessionCacheStats.memoryUsage / 1024 / 1024), // MB
					maxSize: Math.round(sessionCacheStats.maxSize / 1024 / 1024), // MB
					hitRate: Math.round(sessionCacheStats.hitRate * 100) / 100,
				},
			},
			recommendations: getMemoryRecommendations(heapUsagePercent, aiCacheStats, sessionCacheStats),
		};

		return Response.json(stats);
	} catch (error) {
		console.error("获取内存统计失败:", error);
		return Response.json({ error: "获取内存统计失败" }, { status: 500 });
	}
}

// 内存优化建议
function getMemoryRecommendations(heapUsagePercent: number, aiStats: any, sessionStats: any): string[] {
	const recommendations: string[] = [];

	if (heapUsagePercent > 80) {
		recommendations.push("内存使用过高，建议重启应用");
		recommendations.push("考虑减少缓存大小限制");
	} else if (heapUsagePercent > 60) {
		recommendations.push("内存使用偏高，建议清理不必要的缓存");
	}

	if (aiStats.memoryUsagePercent > 90) {
		recommendations.push("AI结果缓存接近满载，考虑增加最大尺寸或减少TTL");
	}

	if (sessionStats.memoryUsagePercent > 90) {
		recommendations.push("用户会话缓存接近满载");
	}

	if (aiStats.hitRate < 70) {
		recommendations.push("AI缓存命中率较低，可能需要调整缓存策略");
	}

	if (recommendations.length === 0) {
		recommendations.push("内存使用状况良好");
	}

	return recommendations;
}

import process from "node:process";

interface CacheItem<T> {
	value: T;
	expireTime: number;
	size: number;
	accessCount: number; // 访问计数
	lastAccess: number; // 最后访问时间
}

interface CacheOptions {
	maxSize?: number;
	maxItems?: number;
	defaultTTL?: number;
	enableStats?: boolean;
}

interface CacheStats {
	size: number;
	memoryUsage: number;
	maxSize: number;
	maxItems: number;
	memoryUsagePercent: number;
	hitRate: number;
	totalHits: number;
	totalMisses: number;
	totalRequests: number;
}

export class MemoryCache<T> {
	private cache = new Map<string, CacheItem<T>>();
	private accessOrder: string[] = [];
	private currentSize = 0;
	private readonly maxSize: number;
	private readonly maxItems: number;
	private readonly defaultTTL: number;
	private readonly enableStats: boolean;

	// 统计信息
	private totalHits = 0;
	private totalMisses = 0;
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(options: CacheOptions = {}) {
		this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB
		this.maxItems = options.maxItems || 1000;
		this.defaultTTL = options.defaultTTL || 30 * 60 * 1000; // 30分钟
		this.enableStats = options.enableStats !== false;

		// 启动定期清理
		this.startPeriodicCleanup();

		// 进程退出时清理定时器
		if (typeof process !== "undefined") {
			process.on("exit", () => this.destroy());
			process.on("SIGINT", () => this.destroy());
			process.on("SIGTERM", () => this.destroy());
		}
	}

	set(key: string, value: T, ttl?: number): void {
		const expireTime = Date.now() + (ttl || this.defaultTTL);
		const size = this.estimateSize(value);

		// 如果单个项目太大，直接拒绝
		if (size > this.maxSize * 0.5) {
			console.warn(`Cache item too large: ${size} bytes, key: ${key.slice(0, 50)}...`);
			return;
		}

		// 删除过期项
		this.cleanExpired();

		// 如果key已存在，更新大小统计
		if (this.cache.has(key)) {
			this.currentSize -= this.cache.get(key)!.size;
		}

		// 确保有足够空间
		while (
			(this.currentSize + size > this.maxSize || this.cache.size >= this.maxItems)
			&& this.cache.size > 0
		) {
			this.evictLRU();
		}

		this.cache.set(key, {
			value,
			expireTime,
			size,
			accessCount: 0,
			lastAccess: Date.now(),
		});
		this.currentSize += size;
		this.updateAccessOrder(key);
	}

	get(key: string): T | undefined {
		const item = this.cache.get(key);
		if (!item) {
			if (this.enableStats)
				this.totalMisses++;
			return undefined;
		}

		if (Date.now() > item.expireTime) {
			this.delete(key);
			if (this.enableStats)
				this.totalMisses++;
			return undefined;
		}

		// 更新访问统计
		item.accessCount++;
		item.lastAccess = Date.now();
		this.updateAccessOrder(key);

		if (this.enableStats)
			this.totalHits++;
		return item.value;
	}

	delete(key: string): boolean {
		const item = this.cache.get(key);
		if (!item)
			return false;

		this.cache.delete(key);
		this.currentSize -= item.size;
		this.accessOrder = this.accessOrder.filter(k => k !== key);
		return true;
	}

	clear(): void {
		this.cache.clear();
		this.accessOrder = [];
		this.currentSize = 0;
		this.totalHits = 0;
		this.totalMisses = 0;
	}

	// 批量删除过期项目，降低单次操作开销
	private cleanExpired(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];
		const maxExpiredToProcess = 50; // 限制单次处理的过期项数量

		let processedCount = 0;
		for (const [key, item] of this.cache) {
			if (now > item.expireTime) {
				expiredKeys.push(key);
				processedCount++;

				// 避免一次性删除过多项目，可能导致卡顿
				if (processedCount >= maxExpiredToProcess) {
					break;
				}
			}
		}

		expiredKeys.forEach(key => this.delete(key));
	}

	// 改进的LRU淘汰策略，结合访问频率
	private evictLRU(): void {
		if (this.accessOrder.length === 0)
			return;

		// 找到最少使用的项目（结合最后访问时间和访问次数）
		let lruKey = this.accessOrder[0];
		let minScore = Number.MAX_VALUE;

		// 检查前几个最旧的项目，选择评分最低的
		const candidateCount = Math.min(5, this.accessOrder.length);
		for (let i = 0; i < candidateCount; i++) {
			const key = this.accessOrder[i];
			const item = this.cache.get(key);
			if (item) {
				// 综合考虑访问次数和时间间隔的评分
				const timeFactor = Date.now() - item.lastAccess;
				const score = timeFactor / (item.accessCount + 1);
				if (score < minScore) {
					minScore = score;
					lruKey = key;
				}
			}
		}

		this.delete(lruKey);
	}

	// 更新访问顺序，优化性能
	private updateAccessOrder(key: string): void {
		// 移除原位置
		const index = this.accessOrder.indexOf(key);
		if (index !== -1) {
			this.accessOrder.splice(index, 1);
		}
		// 添加到末尾
		this.accessOrder.push(key);
	}

	// 优化的大小估算
	private estimateSize(value: T): number {
		if (typeof value === "string") {
			return value.length * 2; // UTF-16
		}
		if (typeof value === "object" && value !== null) {
			try {
				return JSON.stringify(value).length * 2;
			} catch {
				return 1024; // 默认大小，如果无法序列化
			}
		}
		if (typeof value === "number") {
			return 8;
		}
		if (typeof value === "boolean") {
			return 4;
		}
		return 64; // 默认大小
	}

	// 启动定期清理
	private startPeriodicCleanup(): void {
		// 每5分钟清理一次过期项目
		this.cleanupTimer = setInterval(() => {
			this.cleanExpired();
		}, 5 * 60 * 1000);
	}

	// 销毁缓存实例
	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
		this.clear();
	}

	// 获取缓存统计
	getStats(): CacheStats {
		const totalRequests = this.totalHits + this.totalMisses;
		return {
			size: this.cache.size,
			memoryUsage: this.currentSize,
			maxSize: this.maxSize,
			maxItems: this.maxItems,
			memoryUsagePercent: (this.currentSize / this.maxSize) * 100,
			hitRate: totalRequests > 0 ? (this.totalHits / totalRequests) * 100 : 0,
			totalHits: this.totalHits,
			totalMisses: this.totalMisses,
			totalRequests,
		};
	}

	// 获取热点数据统计
	getHotKeys(limit: number = 10): Array<{ key: string; accessCount: number; lastAccess: Date }> {
		const items: Array<{ key: string; accessCount: number; lastAccess: Date }> = [];

		for (const [key, item] of this.cache) {
			items.push({
				key: key.slice(0, 50), // 截断长key以便显示
				accessCount: item.accessCount,
				lastAccess: new Date(item.lastAccess),
			});
		}

		return items
			.sort((a, b) => b.accessCount - a.accessCount)
			.slice(0, limit);
	}
}

// 导出全局缓存实例
export const aiResultCache = new MemoryCache<any>({
	maxSize: 50 * 1024 * 1024, // 50MB
	maxItems: 500,
	defaultTTL: 60 * 60 * 1000, // 1小时
});

export const userSessionCache = new MemoryCache<any>({
	maxSize: 10 * 1024 * 1024, // 10MB
	maxItems: 1000,
	defaultTTL: 30 * 60 * 1000, // 30分钟
});

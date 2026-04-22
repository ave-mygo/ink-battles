"use client";

import type { StatusApiResponse, StatusDashboardProps, UsageLog } from "@ink-battles/shared/types/common/status";
import { Activity, Clock, Cpu, MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import StatusHeader from "./StatusHeader";
import StatusList from "./StatusList";

const STATUS_PAGE_SIZE = 20;

/**
 * 为日志生成稳定键值。
 *
 * 1. 优先使用 Request ID，把同一次逻辑请求视为同一条记录。
 * 2. 没有 Request ID 时，再退回到原始日志字段组合。
 */
const createStatusLogIdentity = (log: UsageLog) =>
	log.request_id
		? `request:${log.request_id}`
		: [
				log.created_at,
				log.token_id,
				log.parent_id,
				log.model_name,
				log.quota,
			].join(":");

/**
 * 合并分页日志并去重。
 *
 * 后端已经按 Request ID 合并过重试日志，但分页窗口动态变化时，
 * 自动刷新或翻页仍可能把同一条逻辑请求重复返回，这里做一次前端兜底去重。
 */
const mergeStatusLogs = (currentLogs: UsageLog[], incomingLogs: UsageLog[]) => {
	const mergedLogs = [...currentLogs];
	const existingKeys = new Set(currentLogs.map(createStatusLogIdentity));

	incomingLogs.forEach((log) => {
		const logKey = createStatusLogIdentity(log);
		if (!existingKeys.has(logKey)) {
			existingKeys.add(logKey);
			mergedLogs.push(log);
		}
	});

	return mergedLogs;
};

function StatCardSkeleton() {
	return (
		<Card className="border-0 shadow-lg overflow-hidden dark:bg-slate-800/50">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="rounded h-5 w-5" />
				</div>
			</CardHeader>
			<CardContent>
				<Skeleton className="mb-2 h-8 w-24" />
			</CardContent>
		</Card>
	);
}

function StatCardsSkeleton() {
	return (
		<div className="mb-8 gap-6 grid lg:grid-cols-4 md:grid-cols-2">
			{Array.from({ length: 4 }).map((_, i) => (
				<StatCardSkeleton key={i} />
			))}
		</div>
	);
}

export default function StatusDashboard({ initialData }: StatusDashboardProps) {
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(60);
	const loadingRef = useRef<HTMLDivElement>(null);

	const { data, isLoading, size, setSize, mutate } = useSWRInfinite(
		(index, previousPageData) => {
			if (previousPageData && !previousPageData.has_more) {
				return null;
			}

			return ["status", index + 1] as const;
		},
		async ([, page]) => {
			const response = await createClientEden().api.v2.status.get({
				query: { page, pageSize: STATUS_PAGE_SIZE },
			});
			const responseData = await normalizeEdenResult<StatusApiResponse>(response.data, response.error, "加载状态失败");
			if (!responseData.success) {
				throw new Error("加载状态失败");
			}

			return responseData;
		},
		{
			fallbackData: [initialData],
			revalidateFirstPage: false,
			revalidateOnFocus: false,
		},
	);

	const pages = data?.length ? data : [initialData];
	const stats = (pages[0] ?? initialData).stats;
	const logs = useMemo(
		() =>
			pages.reduce<UsageLog[]>((mergedLogs, page) => mergeStatusLogs(mergedLogs, page.items), []),
		[pages],
	);
	const currentPage = data?.length ?? 1;
	const hasMore = (pages[pages.length - 1] ?? initialData).has_more;
	const loading = Boolean(data && size > data.length);
	const initialLoading = !data && isLoading;

	// 友好自动刷新：可开关、显示倒计时、页面隐藏时暂停
	useEffect(() => {
		if (!autoRefresh)
			return;
		const interval = setInterval(() => {
			if (document.hidden)
				return; // 页面不可见时暂停计时
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					void mutate();
					return 60;
				}
				return prev - 1;
			});
		}, 1000);
		return () => {
			clearInterval(interval);
		};
	}, [autoRefresh, mutate]);

	const handleManualRefresh = () => {
		setSecondsLeft(60);
		void mutate();
	};

	useIntersectionObserver({
		target: loadingRef,
		onIntersect: (entries) => {
			const [entry] = entries;
			if (entry?.isIntersecting && hasMore && !loading && !initialLoading) {
				void setSize(size + 1);
			}
		},
	});

	return (
		<div className="space-y-8">
			<StatusHeader
				autoRefresh={autoRefresh}
				secondsLeft={secondsLeft}
				refreshing={loading || initialLoading}
				onToggleAuto={() => setAutoRefresh(v => !v)}
				onRefresh={handleManualRefresh}
			/>

			{initialLoading
				? (
						<StatCardsSkeleton />
					)
				: (
						<div className="mb-8 gap-6 grid lg:grid-cols-4 md:grid-cols-2">
							<StatCard
								title="总请求数"
								description="系统总计处理的API请求数量"
								value={stats.totalRequests.toLocaleString()}
								icon={<MessageSquare className="h-6 w-6" />}
								color="from-blue-500 to-blue-600"
								bgColor="from-blue-50 to-blue-100"
							/>
							<StatCard
								title="平均响应时间"
								description="API请求的平均处理时间"
								value={stats.averageTime > 1000 ? `${(stats.averageTime / 1000).toFixed(2)}s` : `${stats.averageTime.toFixed(0)}ms`}
								icon={<Clock className="h-6 w-6" />}
								color="from-emerald-500 to-emerald-600"
								bgColor="from-emerald-50 to-emerald-100"
							/>
							<StatCard
								title="总Token消耗"
								description="AI模型处理消耗的Token总量"
								value={stats.totalTokens.toLocaleString()}
								icon={<Cpu className="h-6 w-6" />}
								color="from-purple-500 to-purple-600"
								bgColor="from-purple-50 to-purple-100"
							/>
							<StatCard
								title="成功率"
								description="API请求的成功处理比例"
								value={(
									<div className="flex gap-3 items-center">
										<CircularProgress value={stats.successRate} size={40} />
										<span className="text-2xl font-bold">
											{stats.successRate.toFixed(1)}
											%
										</span>
									</div>
								)}
								icon={<Activity className="h-6 w-6" />}
								color="from-amber-500 to-amber-600"
								bgColor="from-amber-50 to-amber-100"
							/>
						</div>
					)}

			<StatusList logs={logs} loading={initialLoading} />

			<div
				ref={loadingRef}
				className="flex h-16 items-center justify-center"
			>
				{loading && hasMore && currentPage > 1 && (
					<div className="text-slate-600 px-4 py-2 rounded-full bg-slate-100 flex gap-2 items-center dark:text-slate-300 dark:bg-slate-800/60">
						<div className="border-2 border-emerald-500 border-t-transparent rounded-full h-4 w-4 animate-spin" />
						加载更多数据...
					</div>
				)}
			</div>
		</div>
	);
}

interface StatCardProps {
	title: string;
	description: string;
	value: string | number | React.ReactNode;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
}

function StatCard({ title, description, value, icon, color, bgColor }: StatCardProps) {
	return (
		<Card className={`border-0 shadow-lg overflow-hidden bg-linear-to-br ${bgColor} transition-all duration-300 hover:shadow-xl dark:from-slate-800/60 dark:to-slate-900/40 hover:-translate-y-1`}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<CardTitle className="text-sm text-slate-600 font-medium flex gap-2 items-center dark:text-slate-300">
							{title}
						</CardTitle>
					</div>
					<div className={`p-2 rounded-lg bg-linear-to-br ${color} text-white shadow-md`}>
						{icon}
					</div>
				</div>
				<CardDescription className="text-xs text-slate-500 dark:text-slate-400">
					{description}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="text-2xl text-slate-900 font-bold flex min-h-10 items-center dark:text-slate-100">
					{value}
				</div>
			</CardContent>
		</Card>
	);
}

function CircularProgress({ value = 0, size = 40 }) {
	const radius = (size - 6) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - value / 100);

	return (
		<div className="inline-flex relative">
			<svg width={size} height={size} className="transform -rotate-90">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="#f1f5f9"
					strokeWidth={6}
					fill="none"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke="url(#successGradient)"
					strokeWidth={6}
					fill="none"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
					className="transition-all duration-700 ease-out"
				/>
				<defs>
					<linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop offset="0%" stopColor="#10b981" />
						<stop offset="100%" stopColor="#059669" />
					</linearGradient>
				</defs>
			</svg>
		</div>
	);
}

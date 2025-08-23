"use client";

import type { ApiResponse, Stats, UsageLog } from "@/types/common/status";
import { Activity, Clock, Cpu, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import StatusHeader from "./StatusHeader";
import StatusList from "./StatusList";

function StatCardSkeleton() {
	return (
		<Card className="border-0 shadow-lg overflow-hidden">
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

export default function StatusDashboard() {
	const [logs, setLogs] = useState<UsageLog[]>([]);
	const [loading, setLoading] = useState(false);
	const [initialLoading, setInitialLoading] = useState(true);
	const [autoRefresh, setAutoRefresh] = useState(true);
	const [secondsLeft, setSecondsLeft] = useState(60);
	const [stats, setStats] = useState<Stats>({
		totalRequests: 0,
		averageTime: 0,
		totalTokens: 0,
		successRate: 100,
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const loadingRef = useRef<HTMLDivElement>(null);

	const fetchLogs = async (page: number, isFirstLoad = false) => {
		try {
			if (isFirstLoad) {
				setInitialLoading(true);
			} else {
				setLoading(true);
			}

			const response = await fetch(`/api/status?page=${page}&pageSize=20`);
			const responseData: ApiResponse = await response.json();

			if (responseData.success) {
				if (isFirstLoad) {
					setLogs(responseData.items);
					setStats(responseData.stats);
				} else {
					setLogs(prev => [...prev, ...responseData.items]);
				}
				setHasMore(responseData.items.length === 20);
			}
		} catch (error) {
			console.error("Failed to fetch logs:", error);
		} finally {
			setInitialLoading(false);
			setLoading(false);
		}
	};

	// 友好自动刷新：可开关、显示倒计时、页面隐藏时暂停
	useEffect(() => {
		if (!autoRefresh)
			return;
		const interval = setInterval(() => {
			if (document.hidden)
				return; // 页面不可见时暂停计时
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					// 触发静默刷新（不改变 currentPage，刷新第一页与统计）
					fetchLogs(1, true);
					return 60;
				}
				return prev - 1;
			});
		}, 1000);
		return () => {
			clearInterval(interval);
		};
	}, [autoRefresh]);

	const handleManualRefresh = () => {
		setSecondsLeft(60);
		fetchLogs(1, true);
	};

	useIntersectionObserver({
		target: loadingRef,
		onIntersect: (entries) => {
			const [entry] = entries;
			if (entry?.isIntersecting && hasMore && !loading && !initialLoading) {
				setCurrentPage(prev => prev + 1);
			}
		},
	});

	useEffect(() => {
		fetchLogs(currentPage, currentPage === 1);
	}, [currentPage]);

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
					<div className="text-slate-600 px-4 py-2 rounded-full bg-slate-100 flex gap-2 items-center">
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
		<Card className={`border-0 shadow-lg overflow-hidden bg-gradient-to-br ${bgColor} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<CardTitle className="text-sm text-slate-600 font-medium flex gap-2 items-center">
							{title}
						</CardTitle>
					</div>
					<div className={`p-2 rounded-lg bg-gradient-to-br ${color} text-white shadow-md`}>
						{icon}
					</div>
				</div>
				<CardDescription className="text-xs text-slate-500">
					{description}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="text-2xl text-slate-900 font-bold flex min-h-[40px] items-center">
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

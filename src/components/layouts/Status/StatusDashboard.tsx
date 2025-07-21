"use client";

import type { ApiResponse, Stats, UsageLog } from "@/types/status";
import { Activity, Clock, Cpu, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import StatusHeader from "./StatusHeader";
import StatusList from "./StatusList";

function LoadingModal({ open }: { open: boolean }) {
	if (!open)
		return null;
	return (
		<div className="bg-black/40 flex items-center inset-0 justify-center fixed z-50">
			<div className="px-8 py-8 rounded-2xl bg-white flex flex-col gap-4 min-w-[220px] shadow-2xl items-center animate-fade-in">
				<svg className="text-blue-500 h-10 w-10 animate-spin" viewBox="0 0 24 24">
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
					<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
				</svg>
				<div className="text-lg text-slate-700 font-medium">正在加载数据...</div>
			</div>
		</div>
	);
}

export default function StatusDashboard() {
	const [logs, setLogs] = useState<UsageLog[]>([]);
	const [loading, setLoading] = useState(true);
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
			setLoading(true);
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
			setLoading(false);
		}
	};

	// 自动刷新
	useEffect(() => {
		const timer = setInterval(() => {
			setCurrentPage(1);
			fetchLogs(1, true);
		}, 60000);
		return () => clearInterval(timer);
	}, []);

	useIntersectionObserver({
		target: loadingRef,
		onIntersect: (entries) => {
			const [entry] = entries;
			if (entry?.isIntersecting && hasMore && !loading) {
				setCurrentPage(prev => prev + 1);
			}
		},
	});

	useEffect(() => {
		fetchLogs(currentPage, currentPage === 1);
	}, [currentPage]);

	return (
		<div className="mx-auto px-4 py-8 container relative">
			<LoadingModal open={loading && currentPage === 1} />
			<StatusHeader />

			<div className="mb-8 gap-6 grid lg:grid-cols-4 md:grid-cols-2">
				<StatCard
					title="总请求数"
					value={stats.totalRequests}
					icon={<MessageSquare className="text-blue-500 h-5 w-5" />}
					color="from-blue-100 to-blue-50"
				/>
				<StatCard
					title="平均响应时间"
					value={stats.averageTime > 1000 ? `${(stats.averageTime / 1000).toFixed(2)}s` : `${stats.averageTime.toFixed(0)}ms`}
					icon={<Clock className="text-green-500 h-5 w-5" />}
					color="from-green-100 to-green-50"
				/>
				<StatCard
					title="总Token消耗"
					value={stats.totalTokens.toLocaleString()}
					icon={<Cpu className="text-purple-500 h-5 w-5" />}
					color="from-purple-100 to-purple-50"
				/>
				<StatCard
					title="成功率"
					value={(
						<div className="flex gap-2 items-center">
							<CircularProgress value={stats.successRate} size={36} color="text-yellow-500" />
							<span>
								{stats.successRate.toFixed(2)}
								%
							</span>
						</div>
					)}
					icon={<Activity className="text-yellow-500 h-5 w-5" />}
					color="from-yellow-100 to-yellow-50"
				/>
			</div>

			<StatusList logs={logs} />

			<div
				ref={loadingRef}
				className="flex h-10 items-center justify-center"
			>
				{loading && hasMore && currentPage > 1 && (
					<div className="border-b-2 border-blue-500 rounded-full h-6 w-6 animate-spin" />
				)}
			</div>
		</div>
	);
}

interface StatCardProps {
	title: string;
	value: string | number | React.ReactNode;
	icon: React.ReactNode;
	color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
	return (
		<Card className={`p-6 bg-gradient-to-br ${color} border-0 shadow-sm`}>
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-sm text-gray-500 font-medium">{title}</h3>
				{icon}
			</div>
			<div className="text-3xl text-gray-900 font-extrabold flex gap-2 min-h-[44px] items-center">{value}</div>
		</Card>
	);
}

function CircularProgress({ value = 0, size = 36, color = "#eab308" }) {
	const radius = (size - 6) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - value / 100);
	return (
		<svg width={size} height={size} className="block" style={{ minWidth: size, minHeight: size }}>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke="#f3f4f6"
				strokeWidth={6}
				fill="none"
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke={color}
				strokeWidth={6}
				fill="none"
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				strokeLinecap="round"
				className="transition-all duration-500"
			/>
		</svg>
	);
}

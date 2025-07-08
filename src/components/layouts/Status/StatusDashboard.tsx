"use client";

import type { ApiResponse, Stats, UsageLog } from "@/types/status";
import { Activity, Clock, Cpu, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import StatusHeader from "./StatusHeader";
import StatusList from "./StatusList";

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
		<div className="mx-auto px-4 py-8 container">
			<StatusHeader />

			<div className="mb-8 gap-6 grid lg:grid-cols-4 md:grid-cols-2">
				<StatCard
					title="总请求数"
					value={stats.totalRequests}
					icon={<MessageSquare className="text-blue-500 h-5 w-5" />}
				/>
				<StatCard
					title="平均响应时间"
					value={`${stats.averageTime.toFixed(2)}ms`}
					icon={<Clock className="text-green-500 h-5 w-5" />}
				/>
				<StatCard
					title="总Token消耗"
					value={stats.totalTokens.toLocaleString()}
					icon={<Cpu className="text-purple-500 h-5 w-5" />}
				/>
				<StatCard
					title="成功率"
					value={`${stats.successRate.toFixed(2)}%`}
					icon={<Activity className="text-yellow-500 h-5 w-5" />}
				/>
			</div>

			<StatusList logs={logs} />

			<div
				ref={loadingRef}
				className="flex h-10 items-center justify-center"
			>
				{loading && hasMore && (
					<div className="border-b-2 border-blue-500 rounded-full h-6 w-6 animate-spin" />
				)}
			</div>
		</div>
	);
}

interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
	return (
		<Card className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-sm text-gray-500 font-medium">{title}</h3>
				{icon}
			</div>
			<p className="text-2xl text-gray-900 font-bold">{value}</p>
		</Card>
	);
}

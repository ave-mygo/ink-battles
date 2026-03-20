"use client";

import { ArrowRight, BarChart3, CheckCircle2, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAnalysisTaskAction, getAnalysisStatusAction } from "@/utils/analysis";

interface LocalTask {
	taskId: string;
	title: string;
	createdAt: number;
	status?: "pending" | "processing" | "completed" | "failed";
	error?: string;
	resultId?: string;
}

const REFRESH_COOLDOWN = 2000; // 2秒冷却

export default function WriterAnalysisResultPlaceholder() {
	const [tasks, setTasks] = useState<LocalTask[]>([]);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [canRefresh, setCanRefresh] = useState(true);
	const [cooldownRemaining, setCooldownRemaining] = useState(0);
	const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const router = useRouter();
	// 存储 setTasks 的稳定引用，避免在 useEffect 中直接调用
	const setTasksRef = useRef(setTasks);
	setTasksRef.current = setTasks;

	// Initial load and listen to custom event
	useEffect(() => {
		const loadTasks = () => {
			try {
				const str = localStorage.getItem("ink_battles_tasks");
				setTasksRef.current(str ? JSON.parse(str) : []);
			} catch (e) {
				console.error("Failed to load tasks", e);
			}
		};

		loadTasks();
		const handleUpdate = () => loadTasks();
		window.addEventListener("ink_battles_tasks_updated", handleUpdate);
		return () => window.removeEventListener("ink_battles_tasks_updated", handleUpdate);
	}, []);

	// 清理所有 timer
	useEffect(() => {
		return () => {
			if (cooldownTimerRef.current) {
				clearTimeout(cooldownTimerRef.current);
			}
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	/**
	 * 手动刷新任务状态
	 * 带有2秒冷却时间，避免频繁请求
	 */
	const handleRefreshStatus = async () => {
		if (!canRefresh || isRefreshing)
			return;

		setIsRefreshing(true);
		setCanRefresh(false);
		setCooldownRemaining(Math.ceil(REFRESH_COOLDOWN / 1000));

		// 启动倒计时
		intervalRef.current = setInterval(() => {
			setCooldownRemaining((prev) => {
				if (prev <= 1) {
					clearInterval(intervalRef.current!);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		// 启动冷却计时器
		cooldownTimerRef.current = setTimeout(() => {
			setCanRefresh(true);
			setCooldownRemaining(0);
		}, REFRESH_COOLDOWN);

		try {
			let updated = false;
			const newTasks = [...tasks];

			for (let i = 0; i < newTasks.length; i++) {
				const t = newTasks[i];
				if (t.status === "completed" || t.status === "failed")
					continue;

				try {
					const res = await getAnalysisStatusAction(t.taskId);
					if (res.success) {
						if (res.status === "completed" && res.resultId) {
							// Successfully completed!
							t.status = "completed";
							t.resultId = res.resultId;
							updated = true;
						} else if (res.status === "failed") {
							t.status = "failed";
							t.error = res.error || "分析失败";
							updated = true;
						} else {
							// still processing
							if (t.status !== res.status) {
								t.status = res.status as any;
								updated = true;
							}
						}
					}
				} catch {
					// Network error, continue with next task
				}
			}

			if (updated) {
				setTasks(newTasks);
				localStorage.setItem("ink_battles_tasks", JSON.stringify(newTasks));
			}
		} finally {
			setIsRefreshing(false);
		}
	};

	const removeTask = (taskId: string) => {
		const newTasks = tasks.filter(t => t.taskId !== taskId);
		setTasks(newTasks);
		localStorage.setItem("ink_battles_tasks", JSON.stringify(newTasks));
		// Optionally attempt to delete from server
		deleteAnalysisTaskAction(taskId).catch(console.error);
	};

	/**
	 * 处理"查看结果"点击
	 * 清理本地任务记录后跳转到结果页面（带锚点定位到分析结果）
	 */
	const handleViewResult = async (task: LocalTask) => {
		if (!task.resultId)
			return;

		// Clean up local storage task record
		const newTasks = tasks.filter(t => t.taskId !== task.taskId);
		setTasks(newTasks);
		localStorage.setItem("ink_battles_tasks", JSON.stringify(newTasks));
		window.dispatchEvent(new Event("ink_battles_tasks_updated"));

		// Navigate using taskId (one-time access token)
		router.push(`/analysis/${task.taskId}#analysis-results`);
	};

	// 判断是否有进行中的任务
	const hasActiveTasks = tasks.some(t => t.status !== "completed" && t.status !== "failed");

	if (tasks.length === 0) {
		return (
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardContent className="py-12 text-center">
					<div className="text-slate-400 mb-4">
						<BarChart3 className="mx-auto h-16 w-16" />
					</div>
					<h3 className="text-lg text-slate-600 font-medium mb-2">等待分析</h3>
					<p className="text-slate-500">请输入作品内容并点击"开始战力评测"按钮</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg text-slate-700 flex gap-2 items-center">
						<BarChart3 className="text-blue-500 h-5 w-5" />
						等待分析
					</CardTitle>
					{hasActiveTasks && (
						<Button
							size="sm"
							variant="outline"
							className="text-xs h-8 cursor-pointer"
							onClick={handleRefreshStatus}
							disabled={!canRefresh || isRefreshing}
						>
							{isRefreshing
								? (
									<>
										<RefreshCw className="mr-1 h-3 w-3 animate-spin" />
										刷新中...
									</>
								)
								: cooldownRemaining > 0
									? (
										<>
											<RefreshCw className="mr-1 h-3 w-3" />
											刷新列表 ({cooldownRemaining}s)
										</>
									)
									: (
										<>
											<RefreshCw className="mr-1 h-3 w-3" />
											刷新列表
										</>
									)}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{tasks.map(task => (
					<div key={task.taskId} className="p-3 border rounded-lg bg-gray-50 flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-sm text-slate-700 font-medium">{task.title || "未命名分析"}</span>
							{task.status === "processing" || task.status === "pending" || !task.status
								? (
										<Badge status="processing" />
									)
								: task.status === "failed"
									? (
											<Badge status="failed" />
										)
									: (
											<Badge status="completed" />
										)}
						</div>

						{task.status === "failed" && task.error && (
							<p className="text-xs text-red-500 line-clamp-2">{task.error}</p>
						)}

						{task.status === "failed" && (
							<div className="mt-1 flex gap-2 justify-end">
								<Button size="sm" variant="outline" className="text-xs h-7" onClick={() => removeTask(task.taskId)}>
									<Trash2 className="mr-1 h-3 w-3" />
									删除记录
								</Button>
							</div>
						)}

						{task.status === "completed" && (
							<div className="mt-1 flex gap-2 justify-end">
								<Button
									size="sm"
									variant="default"
									className="text-xs bg-blue-600 h-7 cursor-pointer hover:bg-blue-700"
									onClick={() => handleViewResult(task)}
								>
									<ArrowRight className="mr-1 h-3 w-3" />
									查看结果
								</Button>
							</div>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function Badge({ status }: { status: "processing" | "failed" | "completed" }) {
	if (status === "processing") {
		return (
			<span className="text-xs text-blue-700 font-medium px-2 py-1 rounded bg-blue-100 inline-flex gap-1 items-center">
				<Loader2 className="h-3 w-3 animate-spin" />
				分析中
			</span>
		);
	}
	if (status === "failed") {
		return (
			<span className="text-xs text-red-700 font-medium px-2 py-1 rounded bg-red-100 inline-flex gap-1 items-center">
				<XCircle className="h-3 w-3" />
				失败
			</span>
		);
	}
	return (
		<span className="text-xs text-green-700 font-medium px-2 py-1 rounded bg-green-100 inline-flex gap-1 items-center">
			<CheckCircle2 className="h-3 w-3" />
			完成
		</span>
	);
}

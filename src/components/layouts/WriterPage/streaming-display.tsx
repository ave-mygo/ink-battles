"use client";

import { AlertCircle, CheckCircle2, X, Zap } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StreamingDisplayProps {
	streamContent: string;
	isVisible: boolean;
	onClose: () => void;
	isError?: boolean;
	isCompleted?: boolean;
	progress?: number;
	onRetry?: () => void;
}

export default function StreamingDisplay({
	streamContent,
	isVisible,
	onClose,
	isError = false,
	isCompleted = false,
	progress = 0,
	onRetry: _onRetry,
}: StreamingDisplayProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const isMobile = useSyncExternalStore(
		(cb) => {
			if (typeof window === "undefined")
				return () => {};
			window.addEventListener("resize", cb);
			return () => window.removeEventListener("resize", cb);
		},
		() => (typeof window !== "undefined" ? window.innerWidth < 768 : false),
		() => false,
	);

	useEffect(() => {
		// 使用节流来减少频繁的 DOM 操作
		let timeoutId: NodeJS.Timeout | undefined;

		const scrollToBottom = () => {
			if (scrollRef.current) {
				scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			}
		};

		// 清除之前的定时器
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		// 延迟执行滚动，避免过度频繁的 DOM 操作
		// 只在内容变化且非空时才滚动
		if (streamContent) {
			timeoutId = setTimeout(() => {
				requestAnimationFrame(scrollToBottom);
			}, 150); // 增加延迟以减少CPU占用
		}

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [streamContent]);

	if (!isVisible)
		return null;

	// 完成态优先于错误态，避免成功后仍显示红色
	const getIcon = () => {
		if (isCompleted)
			return <CheckCircle2 className="text-green-600 h-5 w-5 dark:text-green-400" />;
		if (isError)
			return <AlertCircle className="text-red-600 h-5 w-5 dark:text-red-500" />;
		return <Zap className="text-blue-600 h-5 w-5 animate-pulse dark:text-blue-400" />;
	};

	const getTitle = () => {
		if (isCompleted)
			return "分析完成";
		if (isError)
			return "分析遇到错误";
		return "AI 正在分析中...";
	};

	return (
		<div className="p-4 bg-black/50 flex items-center inset-0 justify-center fixed z-50 backdrop-blur-sm dark:bg-black/70">
			<Card className={`border-0 bg-white w-full shadow-2xl dark:bg-gray-800 ${
				isMobile
					? "max-w-full max-h-[90vh]"
					: "max-w-4xl max-h-[80vh]"
			}`}
			>
				<CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
					<CardTitle className="flex gap-2 items-center">
						{getIcon()}
						{getTitle()}
					</CardTitle>
					<div className="flex gap-1">
						<Button
							variant="ghost"
							size="icon"
							onClick={onClose}
							className="h-8 w-8"
							title="关闭"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{!isCompleted && !isError && (
						<div className="mb-4">
							<div className="text-sm text-gray-600 mb-2 flex justify-between dark:text-gray-300">
								<span>分析进度</span>
								<span>
									{Math.round(progress)}
									%
								</span>
							</div>
							<Progress value={progress} className="h-2" />
						</div>
					)}

					<ScrollArea className={`w-full ${
						isMobile ? "h-[50vh]" : "h-[60vh]"
					}`}
					>
						<div className="space-y-2">
							<div className="text-sm text-slate-600 mb-4 dark:text-slate-400">
								{isError ? "错误日志：" : "实时输出流："}
							</div>
							<div
								ref={scrollRef}
								className={`text-sm font-mono p-4 rounded-lg whitespace-pre-wrap wrap-break-word ${
									isError
										? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
										: "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300"
								}`}
							>
								{streamContent}
								{!isCompleted && !isError && (
									<span className="ml-1 bg-blue-600 h-4 w-2 inline-block animate-pulse" />
								)}
							</div>

							{isError && (
								<div className="mt-4 p-3 border border-yellow-200 rounded-lg bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
									<p className="text-sm text-yellow-800 dark:text-yellow-300">
										如果问题持续出现，请尝试：
									</p>
									<ul className="text-sm text-yellow-700 mt-2 space-y-1 dark:text-yellow-200">
										<li>• 检查网络连接</li>
										<li>• 减少文本长度</li>
										<li>• 刷新页面重试</li>
										<li>• 切换到WiFi网络（移动端）</li>
									</ul>
									{streamContent.includes("调试信息:") && (
										<div className="text-xs font-mono mt-3 p-2 rounded bg-gray-100 dark:bg-gray-800">
											<p className="text-gray-600 mb-1 dark:text-gray-400">技术支持信息（可提供给客服）：</p>
											<div className="text-gray-800 dark:text-gray-200">
												{streamContent.split("调试信息:")[1]?.split("\n").slice(0, 4).map((line, idx) => (
													<div key={idx}>{line.trim()}</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	);
}

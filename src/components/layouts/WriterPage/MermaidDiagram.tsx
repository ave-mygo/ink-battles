"use client";

import type { ReactNode } from "react";
import type { MermaidDiagram as MermaidDiagramType } from "@/types/callback/ai";
import { AlertTriangle, GitBranch, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import mermaid from "mermaid";
import { Component, useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 初始化 mermaid 配置
mermaid.initialize({
	startOnLoad: false,
	theme: "default",
	securityLevel: "loose",
	fontFamily: "system-ui, -apple-system, sans-serif",
	flowchart: {
		useMaxWidth: true,
		htmlLabels: true,
		curve: "basis",
	},
});

/**
 * 错误边界组件 - 防止 Mermaid 渲染错误导致整个页面崩溃
 */
interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	title?: string;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class MermaidErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			return this.props.fallback || (
				<div className="text-amber-600 p-4 text-center border border-amber-200 rounded-lg bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-900/20">
					<AlertTriangle className="mx-auto mb-2 h-5 w-5" />
					<p className="text-sm font-medium">图表渲染时发生错误</p>
					{this.props.title && (
						<p className="text-xs text-amber-500 mt-1 dark:text-amber-500">
							图表:
							{" "}
							{this.props.title}
						</p>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}

interface MermaidChartProps {
	/** Mermaid 图表代码 */
	code: string;
	/** 图表标题 */
	title: string;
}

/**
 * 单个 Mermaid 图表渲染组件（带缩放功能）
 */
function MermaidChart({ code, title }: MermaidChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const uniqueId = useId();
	const [error, setError] = useState<string | null>(null);
	const [isRendered, setIsRendered] = useState(false);
	const [scale, setScale] = useState(1);

	// 缩放控制
	const MIN_SCALE = 0.5;
	const MAX_SCALE = 3;
	const SCALE_STEP = 0.1;

	const handleZoomIn = useCallback(() => {
		setScale(prev => Math.min(prev + SCALE_STEP, MAX_SCALE));
	}, []);

	const handleZoomOut = useCallback(() => {
		setScale(prev => Math.max(prev - SCALE_STEP, MIN_SCALE));
	}, []);

	const handleResetZoom = useCallback(() => {
		setScale(1);
	}, []);

	// 滚轮缩放
	const handleWheel = useCallback((e: WheelEvent) => {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
			setScale(prev => Math.min(Math.max(prev + delta, MIN_SCALE), MAX_SCALE));
		}
	}, []);

	// 绑定滚轮事件
	useEffect(() => {
		const wrapper = wrapperRef.current;
		if (wrapper) {
			wrapper.addEventListener("wheel", handleWheel, { passive: false });
			return () => wrapper.removeEventListener("wheel", handleWheel);
		}
	}, [handleWheel]);

	useEffect(() => {
		const renderDiagram = async () => {
			if (!containerRef.current)
				return;

			try {
				// 将分号分隔的代码转换为换行分隔
				const formattedCode = code.replace(/;/g, "\n");

				// 验证语法
				const isValid = await mermaid.parse(formattedCode);
				if (!isValid) {
					setError("图表语法无效");
					return;
				}

				// 生成唯一 ID
				const diagramId = `mermaid-${uniqueId.replace(/:/g, "-")}`;

				// 渲染图表
				const { svg } = await mermaid.render(diagramId, formattedCode);
				containerRef.current.innerHTML = svg;
				setIsRendered(true);
				setError(null);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "图表渲染失败";
				setError(errorMessage);
				setIsRendered(false);
			}
		};

		renderDiagram();
	}, [code, uniqueId]);

	if (error) {
		return (
			<div className="text-slate-500 p-4 text-center rounded-lg bg-slate-50 dark:text-slate-400 dark:bg-slate-800/50">
				<AlertTriangle className="text-amber-500 mx-auto mb-2 h-5 w-5" />
				<p className="text-sm">{error}</p>
				<p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
					图表:
					{" "}
					{title}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<h5 className="text-sm text-slate-700 font-medium dark:text-slate-300">{title}</h5>
				{isRendered && (
					<div className="flex gap-1 items-center">
						<span className="text-xs text-slate-400 mr-2">
							{Math.round(scale * 100)}
							%
						</span>
						<Button
							variant="ghost"
							size="sm"
							className="p-0 h-7 w-7 cursor-pointer"
							onClick={handleZoomOut}
							disabled={scale <= MIN_SCALE}
							title="缩小 (Ctrl+滚轮)"
						>
							<ZoomOut className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="p-0 h-7 w-7 cursor-pointer"
							onClick={handleResetZoom}
							title="重置缩放"
						>
							<RotateCcw className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="p-0 h-7 w-7 cursor-pointer"
							onClick={handleZoomIn}
							disabled={scale >= MAX_SCALE}
							title="放大 (Ctrl+滚轮)"
						>
							<ZoomIn className="h-4 w-4" />
						</Button>
					</div>
				)}
			</div>
			<div
				ref={wrapperRef}
				className="border border-slate-200 rounded-lg bg-white overflow-auto dark:border-slate-700 dark:bg-slate-800/50"
				style={{ maxHeight: "500px" }}
			>
				<div
					ref={containerRef}
					className={`p-4 w-full origin-top-left transition-transform ${!isRendered ? "animate-pulse min-h-[100px]" : ""}`}
					style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
				/>
			</div>
			{isRendered && (
				<p className="text-xs text-slate-400 text-center dark:text-slate-500">
					按住 Ctrl/Cmd + 滚轮可缩放图表
				</p>
			)}
		</div>
	);
}

interface MermaidDiagramsProps {
	/** Mermaid 图表数组 */
	diagrams: MermaidDiagramType[];
}

/**
 * Mermaid 图表展示组件
 * 用于在分析结果中展示可视化的作品结构图表
 * 使用三栏宽度布局，支持缩放和错误边界保护
 */
export default function MermaidDiagrams({ diagrams }: MermaidDiagramsProps) {
	if (!diagrams || diagrams.length === 0) {
		return null;
	}

	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-white/5 md:col-span-3 dark:ring-1 dark:ring-white/10">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<GitBranch className="text-indigo-600 h-5 w-5 dark:text-indigo-400" />
					结构分析图表
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{diagrams.map((diagram, index) => (
					<MermaidErrorBoundary key={`${diagram.type}-${index}`} title={diagram.title}>
						<MermaidChart
							code={diagram.code}
							title={diagram.title}
						/>
					</MermaidErrorBoundary>
				))}
			</CardContent>
		</Card>
	);
}

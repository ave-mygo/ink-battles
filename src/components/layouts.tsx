"use client";

import type { AnalysisResult } from "@/types/callback/ai";
import type { GradingModelConfig } from "@/types/common/config";
import { BarChart3, BookOpen, Brain, Heart, PenTool, RefreshCw, Shield, Star, Target, Zap } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import StreamingDisplay from "@/components/layouts/WriterPage/streaming-display";
import WriterAnalysisHeader from "@/components/layouts/WriterPage/WriterAnalysisHeader";
import WriterAnalysisInput from "@/components/layouts/WriterPage/WriterAnalysisInput";
import WriterAnalysisModes from "@/components/layouts/WriterPage/WriterAnalysisModes";
import WriterAnalysisResult from "@/components/layouts/WriterPage/WriterAnalysisResult";
import WriterAnalysisResultPlaceholder from "@/components/layouts/WriterPage/WriterAnalysisResultPlaceholder";
import WriterModelSelector from "@/components/layouts/WriterPage/WriterModelSelector";
import { Button } from "@/components/ui/button";
import { verifyArticleValue } from "@/lib/ai";
import { getFingerprintId } from "@/lib/fingerprint";
import { calculateFinalScore } from "@/lib/utils-client";

interface WriterAnalysisSystemProps {
	availableGradingModels: GradingModelConfig[];
}

const evaluationModes = [
	{
		id: "beginner",
		name: "初窥门径",
		description: "针对未出版或未获得公认的作品，设定最高评分权限限制",
		text: `所有基础14维度评分最高不得超过4.5分（SSS禁用）
- 经典性权重最高为1.1
- 新锐性权重不受限制
- 默认关闭，须用户声明开启`,
		icon: <BookOpen className="h-4 w-4" />,
	},
	{
		id: "strict",
		name: "严苛编辑",
		description: "模拟保守出版行业的打分标准，防止AI默认\"鼓励倾向\"",
		text: `每个基础维度评分至少随机下降一个等级（如 S→A）
- 降分可视为"最低可接受线"
- 适用于反向压力测试`,
		icon: <Target className="h-4 w-4" />,
	},
	{
		id: "reader",
		name: "宽容读者",
		description: "引导评分者主动放大作品优点，适用于创作初期鼓励",
		text: `每个基础维度允许上调半等级（如 A→A+）
- 不强制，视文本表现而定
- 对负面维度不自动惩罚`,
		icon: <Star className="h-4 w-4" />,
	},
	{
		id: "judge",
		name: "文本法官",
		description: "要求所有评分行为有文本证据支撑，适用于学术评价",
		text: `每一个维度的分数必须由具体文本片段作为评估依据
- 无依据时不可给高分
- 强制启用"评分备注"`,
		icon: <Brain className="h-4 w-4" />,
	},
	{
		id: "fan",
		name: "热血粉丝",
		description: "允许用户在特殊情感偏好下突破原本的评分限制",
		text: `可手动解除部分维度（如情感穿透力、人物塑造）的 SSS 限制
- 可设定允许使用的超上限维度种类
- 仅适用于偏爱型阅读`,
		icon: <Heart className="h-4 w-4" />,
	},
	{
		id: "anti-modern",
		name: "反现代主义者",
		description: "削弱先锋性、结构复杂度、引用张力等后现代向维度影响力",
		text: `可设定上述维度的默认评分封顶为 B（或评分不计入总分）
- 适合传统叙事、情节导向、古典主义作品评价`,
		icon: <Target className="h-4 w-4" />,
	},
	{
		id: "quick",
		name: "速写视角",
		description: "限定快速评分场景，仅允许少量维度参与评估",
		text: `评分者最多选择 3 个及以上维度进行简略打分
- 其他维度不参与总评分计算
- 总分不具出版级参考性，仅供速评或口播场景使用`,
		icon: <PenTool className="h-4 w-4" />,
	},
	{
		id: "fragment",
		name: "碎片主义护法",
		description: "强化先锋性、语言原创性、结构实验等维度的评分权重",
		text: `允许上述维度使用主动偏好加权（如 ×1.5）
- 可与其他提示词并行激活（如"热血粉丝"）`,
		icon: <Zap className="h-4 w-4" />,
	},
	{
		id: "ai-detection",
		name: "AI鉴别师",
		description: "专门检测和评估文本的AI生成特征，提供AI含量分析",
		text: `分析文本的AI生成可能性
- 检测语言模式、结构规律性、创意独特性
- 评估人类创作与AI辅助的混合程度
- 可与碎片主义护法并行使用，提供双重分析视角`,
		icon: <Shield className="h-4 w-4" />,
	},
];

export default function WriterAnalysisSystem({ availableGradingModels }: WriterAnalysisSystemProps) {
	const [articleText, setArticleText] = useState("");
	const [selectedMode, setSelectedMode] = useState<string[]>([]);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
	const [isModesExpanded, setIsModesExpanded] = useState(false);
	const [selectedModeName, setSelectedModeName] = useState<string[]>([]);
	const [streamContent, setStreamContent] = useState("");
	const [showStreamingDisplay, setShowStreamingDisplay] = useState(false);
	const [isError, setIsError] = useState(false);
	const [isCompleted, setIsCompleted] = useState(false);
	const [progress, setProgress] = useState(0);
	const [retryCount, setRetryCount] = useState(0);
	const [abortController, setAbortController] = useState<AbortController | null>(null);

	const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isCancelledRef = useRef(false);
	const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	// 缓存校验结果，重试时跳过校验
	const verifyResultRef = useRef<{
		session: string;
		fingerprint: string;
	} | null>(null);
	const DEFAULT_INDEX = 2;
	const defaultModelId = String(DEFAULT_INDEX < availableGradingModels.length ? DEFAULT_INDEX : 0);

	const STORAGE_KEY = "writer.selectedModelIndex";
	const subscribe = (callback: () => void) => {
		if (typeof window === "undefined")
			return () => { };
		const onStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY)
				callback();
		};
		const onCustom = () => callback();
		window.addEventListener("storage", onStorage);
		window.addEventListener("writer-model-change", onCustom as EventListener);
		return () => {
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("writer-model-change", onCustom as EventListener);
		};
	};
	const getSnapshot = () => {
		try {
			if (typeof window !== "undefined") {
				const saved = window.localStorage.getItem(STORAGE_KEY);
				const index = Number.parseInt(saved || "", 10);
				if (!Number.isNaN(index) && index >= 0 && index < availableGradingModels.length)
					return String(index);
			}
		} catch { }
		return defaultModelId;
	};
	const getServerSnapshot = () => defaultModelId;
	const selectedModelId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	const setSelectedModelId = (id: string) => {
		try {
			if (typeof window !== "undefined") {
				window.localStorage.setItem(STORAGE_KEY, id);
				window.dispatchEvent(new Event("writer-model-change"));
			}
		} catch { }
	};

	const handleModeChange = (modeId: string, checked: boolean, modeName: string) => {
		if (modeId === "ai-detection")
			return;

		if (modeId === "fragment") {
			if (checked) {
				setSelectedMode(prev => prev.includes(modeId) ? prev : [...prev, modeId]);
				setSelectedModeName(prev => prev.includes(modeName) ? prev : [...prev, modeName]);
			} else {
				setSelectedMode(prev => prev.filter(id => id !== modeId));
				setSelectedModeName(prev => prev.filter(name => name !== modeName));
			}
		} else {
			if (checked) {
				const parallelModes = selectedMode.filter(id => id === "fragment");
				const parallelModeNames = selectedModeName.filter(name => name === "碎片主义护法");

				setSelectedMode([modeId, ...parallelModes]);
				setSelectedModeName([modeName, ...parallelModeNames]);
			} else {
				setSelectedMode(prev => prev.filter(id => id !== modeId));
				setSelectedModeName(prev => prev.filter(name => name !== modeName));
			}
		}
	};

	const handleClear = () => {
		if (abortController) {
			abortController.abort();
			setAbortController(null);
		}
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}
		isCancelledRef.current = true;
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}

		setArticleText("");
		setSelectedMode([]);
		setSelectedModeName([]);
		setAnalysisResult(null);
		setStreamContent("");
		setShowStreamingDisplay(false);
		setIsError(false);
		setIsCompleted(false);
		setProgress(0);
		setRetryCount(0);
		verifyResultRef.current = null;
		toast.success("已清除所有内容");
	};

	const resetAnalysisState = () => {
		setIsError(false);
		setIsCompleted(false);
		setProgress(0);
		setStreamContent("");
	};

	// 简化的结果解析，不再需要处理流式标记
	const parseStreamedResult = (content: string): AnalysisResult | null => {
		try {
			// 尝试匹配 Markdown JSON 代码块
			const jsonMatch = content.match(/```json\n?([\s\S]+?)\n?```/) || content.match(/\{[\s\S]+\}/);

			if (jsonMatch) {
				const jsonStr = jsonMatch[1] || jsonMatch[0];
				const parsed = JSON.parse(jsonStr.trim());
				if (parsed && (parsed.overallScore == null || parsed.overallScore === 0)) {
					parsed.overallScore = calculateFinalScore(parsed);
				}
				return parsed as AnalysisResult;
			}

			// 尝试直接解析
			const fallback = JSON.parse(content.trim());
			if (fallback && (fallback.overallScore == null || fallback.overallScore === 0)) {
				fallback.overallScore = calculateFinalScore(fallback);
			}
			return fallback as AnalysisResult;
		} catch (error) {
			console.error("解析结果失败，内容可能不完整:", error);
			return null;
		}
	};

	const simulateProgress = (startTime: number) => {
		const interval = setInterval(() => {
			const elapsed = Date.now() - startTime;
			const expectedDuration = 60000;
			// 限制进度最大到 90%，剩余由真实流驱动
			const progressValue = Math.min(90, (elapsed / expectedDuration) * 100);
			setProgress(progressValue);

			if (progressValue >= 90) {
				clearInterval(interval);
			}
		}, 1000);
		return interval;
	};

	const performAnalysis = async (isRetry = false): Promise<void> => {
		if (isCancelledRef.current)
			return;

		const controller = new AbortController();
		setAbortController(controller);

		if (!isRetry) {
			resetAnalysisState();
		} else {
			setIsError(false);
			setIsCompleted(false);
		}

		const startTime = Date.now();
		const progressInterval = simulateProgress(startTime);
		progressIntervalRef.current = progressInterval as unknown as ReturnType<typeof setInterval>;

		try {
			let fingerprint: string;
			let session: string;

			// 重试时跳过校验，使用缓存的结果
			if (isRetry && verifyResultRef.current) {
				setStreamContent(prev => `${prev}重试分析，跳过校验...\n`);
				({ fingerprint, session } = verifyResultRef.current);
			} else {
				setStreamContent(prev => `${prev}开始分析，校验文章内容...\n`);

				fingerprint = await getFingerprintId();
				// 获取当前选中模型的名称
				const modelIndex = Number.parseInt(selectedModelId, 10);
				const currentModel = availableGradingModels[modelIndex];
				const currentModelName = currentModel?.model || "";
				const verifyResult = await verifyArticleValue(articleText, selectedModeName.join(","), selectedModelId, currentModelName, fingerprint);

				if (!verifyResult.success) {
					throw new Error(`校验失败: ${verifyResult.error || "文章内容不符合分析标准"}`);
				}

				// 缓存校验结果供重试使用
				session = verifyResult.session || "";
				verifyResultRef.current = { session, fingerprint };
			}

			setStreamContent(prev => `${prev}${isRetry ? "" : "校验通过，"}正在分析中...\n`);
			setProgress(10);

			const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟总超时

			const response = await fetch("/api/analyze-stream", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Fingerprint": fingerprint,
					"X-Session": session,
				},
				body: JSON.stringify({
					articleText,
					mode: selectedModeName.join(","),
					modelId: selectedModelId,
				}),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
			}

			if (!response.body)
				throw new Error("响应体为空");

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let fullContent = "";

			setProgress(20);

			while (true) {
				const { done, value } = await reader.read();
				if (isCancelledRef.current) {
					try {
						await reader.cancel();
					} catch {}
					break;
				}
				if (done)
					break;

				const chunk = decoder.decode(value, { stream: true });
				fullContent += chunk;
				setStreamContent(prev => prev + chunk);

				// 基于内容长度给一点额外的进度反馈，增加活跃感
				const progressValue = Math.min(95, 20 + (fullContent.length / 2000) * 60);
				setProgress(prev => Math.max(prev, progressValue));
			}

			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			setProgress(98);

			const parsedResult = parseStreamedResult(fullContent);

			if (parsedResult) {
				setAnalysisResult(parsedResult);
				setProgress(100);
				setIsError(false);
				setIsCompleted(true);
				setStreamContent(prev => `${prev}\n✅ 分析完成！`);
				toast.success("分析完成");

				setTimeout(() => {
					setShowStreamingDisplay(false);
					setStreamContent("");
					setProgress(0);
				}, 3000);
			} else {
				throw new Error("AI返回结果格式无法解析");
			}
		} catch (error: any) {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			setIsError(true);
			setProgress(0);

			let errorMessage = "分析过程中发生错误";
			if (error.name === "AbortError")
				errorMessage = "请求被取消或超时";
			else errorMessage = error.message || errorMessage;

			setStreamContent(prev => `${prev}\n❌ ${errorMessage}\n`);

			const isMobile = window.innerWidth < 768;
			if (retryCount < (isMobile ? 3 : 2) && !errorMessage.includes("校验失败") && !errorMessage.includes("取消")) {
				const nextRetryCount = retryCount + 1;
				setRetryCount(nextRetryCount);
				setStreamContent(prev => `${prev}准备第 ${nextRetryCount} 次重试...\n`);

				if (retryTimeoutRef.current)
					clearTimeout(retryTimeoutRef.current);
				retryTimeoutRef.current = setTimeout(() => {
					if (!isCancelledRef.current)
						performAnalysis(true);
				}, 2000);
			} else {
				toast.error(errorMessage);
			}
		} finally {
			setAbortController(null);
		}
	};

	const handleAnalyze = async () => {
		if (!articleText.trim()) {
			toast.error("请先输入要分析的作品内容");
			return;
		}

		isCancelledRef.current = false;
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current);
			retryTimeoutRef.current = null;
		}

		// 新分析时清除缓存的校验结果
		verifyResultRef.current = null;
		setIsAnalyzing(true);
		setShowStreamingDisplay(true);
		setRetryCount(0);

		try {
			await performAnalysis();
		} catch (error) {
			console.error("启动分析失败:", error);
		} finally {
			setIsAnalyzing(false);
		}
	};

	const getScoreColor = (score: number) => {
		if (score >= 80)
			return "text-green-600 dark:text-green-400";
		if (score >= 60)
			return "text-blue-600 dark:text-blue-400";
		if (score >= 40)
			return "text-yellow-600 dark:text-yellow-400";
		return "text-red-600 dark:text-red-400";
	};

	const getScoreBgColor = (score: number) => {
		if (score >= 80)
			return "bg-green-50 dark:bg-green-950/30";
		if (score >= 60)
			return "bg-blue-50 dark:bg-blue-950/30";
		if (score >= 40)
			return "bg-yellow-50 dark:bg-yellow-950/30";
		return "bg-red-50 dark:bg-red-950/30";
	};

	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-6 container max-w-7xl sm:py-8">
				<WriterAnalysisHeader />

				<div className="mb-6 gap-6 grid lg:gap-8 lg:grid-cols-8">
					<div className="lg:col-span-5">
						<WriterAnalysisInput articleText={articleText} setArticleText={setArticleText} />
					</div>
					<div className="lg:col-span-3">
						<WriterModelSelector
							availableModels={availableGradingModels}
							selectedModelId={selectedModelId}
							onModelChange={setSelectedModelId}
							disabled={isAnalyzing}
						/>
					</div>
				</div>

				<div className="mb-6">
					<WriterAnalysisModes
						evaluationModes={evaluationModes}
						selectedMode={selectedMode}
						isModesExpanded={isModesExpanded}
						setIsModesExpanded={setIsModesExpanded}
						handleModeChange={handleModeChange}
					/>
				</div>

				<div className="mb-8 flex flex-col gap-4 items-center sm:flex-row sm:justify-center">
					<Button
						onClick={handleAnalyze}
						disabled={isAnalyzing || !articleText.trim()}
						size="lg"
						className="btn-mygo-rainbow text-base text-white font-medium px-8 py-3 rounded-lg w-full shadow-md transition-all duration-150 sm:w-auto focus:ring-2 hover:shadow-lg"
					>
						{isAnalyzing
							? (
									<>
										<Zap className="mr-2 h-4 w-4 animate-spin" />
										正在分析中...
									</>
								)
							: (
									<>
										<BarChart3 className="mr-2 h-4 w-4" />
										开始战力评测
									</>
								)}
					</Button>

					<Button
						onClick={handleClear}
						disabled={isAnalyzing}
						size="lg"
						variant="outline"
						className="text-base font-medium px-8 py-3 border-gray-300 rounded-lg bg-white w-full transition-all duration-150 dark:text-slate-100 dark:border-slate-700 hover:border-gray-400 dark:bg-slate-800/60 hover:bg-gray-50 disabled:opacity-50 sm:w-auto disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500/20 dark:hover:bg-slate-700"
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						清除重置
					</Button>
				</div>

				{analysisResult
					? (
							<WriterAnalysisResult
								analysisResult={analysisResult}
								getScoreColor={getScoreColor}
								getScoreBgColor={getScoreBgColor}
							/>
						)
					: (
							<WriterAnalysisResultPlaceholder />
						)}

				<StreamingDisplay
					streamContent={streamContent}
					isVisible={showStreamingDisplay}
					onClose={() => {
						if (abortController)
							abortController.abort();
						isCancelledRef.current = true;
						if (retryTimeoutRef.current) {
							clearTimeout(retryTimeoutRef.current);
							retryTimeoutRef.current = null;
						}
						if (progressIntervalRef.current) {
							clearInterval(progressIntervalRef.current);
							progressIntervalRef.current = null;
						}
						setShowStreamingDisplay(false);
						setIsAnalyzing(false);
					}}
					isError={isError}
					isCompleted={isCompleted}
					progress={progress}
				/>
			</div>
		</div>
	);
}

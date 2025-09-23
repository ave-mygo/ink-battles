"use client";

import type { AnalysisResult } from "@/types/callback/ai";
import { BarChart3, BookOpen, Brain, Heart, PenTool, RefreshCw, Shield, Star, Target, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import StreamingDisplay from "@/components/layouts/WriterPage/streaming-display";
import WriterAnalysisHeader from "@/components/layouts/WriterPage/WriterAnalysisHeader";
import WriterAnalysisInput from "@/components/layouts/WriterPage/WriterAnalysisInput";
import WriterAnalysisModes from "@/components/layouts/WriterPage/WriterAnalysisModes";
import WriterAnalysisResult from "@/components/layouts/WriterPage/WriterAnalysisResult";
import WriterAnalysisResultPlaceholder from "@/components/layouts/WriterPage/WriterAnalysisResultPlaceholder";
import WriterModelSelector from "@/components/layouts/WriterPage/WriterModelSelector";
import { Button } from "@/components/ui/button";
import { getAvailableGradingModels } from "@/config";
import { verifyArticleValue } from "@/lib/ai";
import { getFingerprintId } from "@/lib/fingerprint";
import { calculateFinalScore } from "@/lib/utils-client";

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

export default function WriterAnalysisSystem() {
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
	const availableGradingModels = getAvailableGradingModels();
	const [selectedModelId, setSelectedModelId] = useState<string>(availableGradingModels[0].model);
	const handleModeChange = (modeId: string, checked: boolean, modeName: string) => {
		// 阻止AI鉴别师被选中
		if (modeId === "ai-detection") {
			return;
		}

		if (modeId === "fragment") {
			// 并行激活碎片主义护法
			if (checked) {
				setSelectedMode(prev => prev.includes(modeId) ? prev : [...prev, modeId]);
				setSelectedModeName(prev => prev.includes(modeName) ? prev : [...prev, modeName]);
			} else {
				setSelectedMode(prev => prev.filter(id => id !== modeId));
				setSelectedModeName(prev => prev.filter(name => name !== modeName));
			}
		} else {
			if (checked) {
				// 保留现有的并行模式，添加新选择的主模式
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
		// 取消正在进行的请求
		if (abortController) {
			abortController.abort();
			setAbortController(null);
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
		toast.success("已清除所有内容");
	};

	const resetAnalysisState = () => {
		setIsError(false);
		setIsCompleted(false);
		setProgress(0);
		setStreamContent("");
	};

	const parseStreamedResult = (content: string): AnalysisResult | null => {
		try {
			// 首先移除所有模式标识
			const cleanContent = content.replace(/<!--STREAM_MODE:\w+-->/g, "");

			// 优化正则，避免 \s* 和 [\s\S]*? 组合导致的回溯
			const jsonMatch = cleanContent.match(/```json\n?([\s\S]+?)\n?```/) || cleanContent.match(/\{[\s\S]+\}/);

			if (jsonMatch) {
				const jsonStr = jsonMatch[1] || jsonMatch[0];
				const parsed = JSON.parse(jsonStr.trim());
				if (parsed && (parsed.overallScore == null || parsed.overallScore === 0)) {
					parsed.overallScore = calculateFinalScore(parsed);
				}
				return parsed as AnalysisResult;
			}

			// 如果没有找到JSON标记，尝试直接解析整个内容
			const fallback = JSON.parse(cleanContent.trim());
			if (fallback && (fallback.overallScore == null || fallback.overallScore === 0)) {
				fallback.overallScore = calculateFinalScore(fallback);
			}
			return fallback as AnalysisResult;
		} catch (error) {
			console.error("解析流式结果失败:", error);
			return null;
		}
	};

	const simulateProgress = (startTime: number) => {
		const interval = setInterval(() => {
			const elapsed = Date.now() - startTime;
			const expectedDuration = 60000; // 预计60秒完成
			const progressValue = Math.min(90, (elapsed / expectedDuration) * 100);
			setProgress(progressValue);

			if (progressValue >= 90) {
				clearInterval(interval);
			}
		}, 1000);

		return interval;
	};

	const performAnalysis = async (isRetry = false): Promise<void> => {
		const controller = new AbortController();
		setAbortController(controller);

		if (!isRetry) {
			resetAnalysisState();
		}

		const startTime = Date.now();
		const progressInterval = simulateProgress(startTime);

		try {
			setStreamContent(prev => `${prev}${isRetry ? "重试" : "开始"}分析，校验文章内容...\n`);

			// 生成浏览器指纹
			const fingerprint = await getFingerprintId();

			// 验证文章内容
			const verifyResult = await verifyArticleValue(articleText, selectedModeName.join(","), selectedModelId, fingerprint);

			if (!verifyResult.success) {
				const errorMessage = verifyResult.error || "文章内容不符合分析标准";
				throw new Error(`校验失败: ${errorMessage}`);
			}

			setStreamContent(prev => `${prev}校验通过，正在分析中...\n`);
			setProgress(10);

			// 创建请求超时
			const timeoutId = setTimeout(() => {
				controller.abort();
			}, 120000); // 2分钟超时

			const response = await fetch("/api/analyze-stream", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Fingerprint": fingerprint,
					"X-Session": verifyResult.session || "",
				},
				body: JSON.stringify({
					articleText,
					mode: selectedModeName.join(","),
					modelId: selectedModelId,
					needSearch: verifyResult.needSearch,
					searchKeywords: verifyResult.searchKeywords,
				}),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
			}

			if (!response.body) {
				throw new Error("响应体为空");
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let fullContent = "";
			let streamModeDetected = false;

			setProgress(20);

			while (true) {
				const readPromise = reader.read();
				const timeoutPromise = new Promise<never>((_, reject) => {
					setTimeout(() => reject(new Error("读取超时")), 30000); // 30秒读取超时
				});

				const { done, value } = await Promise.race([readPromise, timeoutPromise]);

				if (done)
					break;

				const chunk = decoder.decode(value, { stream: true });

				// 检查流式模式标识
				if (!streamModeDetected) {
					const modeMatch = chunk.match(/<!--STREAM_MODE:(\w+)-->/);
					if (modeMatch) {
						streamModeDetected = true;
						const detectedMode = modeMatch[1];

						let modeMessage = "";
						switch (detectedMode) {
							case "native":
								modeMessage = "✅ 检测到原生流式模式 - API完全支持流式响应";
								break;
							case "simulated":
								modeMessage = "⚠️ 检测到接口无法正常使用流式 - 接口将以默认方式返回";
								break;
							default:
								modeMessage = "✅ 检测到默认模式 - API完全支持正常响应";
						}

						setStreamContent(prev => `${prev}${modeMessage}\n`);

						// 移除模式标识，只保留实际内容
						const cleanChunk = chunk.replace(/<!--STREAM_MODE:\w+-->/, "");
						if (cleanChunk.trim()) {
							fullContent += cleanChunk;
							setStreamContent(prev => `${prev}${cleanChunk}`);
						}
						continue;
					}
				}

				fullContent += chunk;
				setStreamContent(prev => `${prev}${chunk}`);

				// 动态更新进度
				const progressValue = Math.min(80, 20 + (fullContent.length / 1000) * 2);
				setProgress(progressValue);
			}

			clearInterval(progressInterval);
			setProgress(95);

			// 解析结果
			const parsedResult = parseStreamedResult(fullContent);

			if (parsedResult) {
				setAnalysisResult(parsedResult);
				setProgress(100);
				setIsCompleted(true);
				setStreamContent(prev => `${prev}\n✅ 分析完成！`);
				toast.success("分析完成");

				setTimeout(() => {
					setShowStreamingDisplay(false);
					setStreamContent("");
					setProgress(0);
				}, 3000);
			} else {
				throw new Error("无法解析分析结果");
			}
		} catch (error: any) {
			clearInterval(progressInterval);
			setIsError(true);
			setProgress(0);

			let errorMessage = "分析过程中发生错误";

			if (error.name === "AbortError") {
				errorMessage = "请求被取消或超时";
			} else if (error.message.includes("Failed to fetch")) {
				errorMessage = "网络连接失败，请检查网络状态";
			} else if (error.message.includes("校验失败")) {
				errorMessage = error.message;
			} else {
				errorMessage = error.message || errorMessage;
			}

			setStreamContent(prev => `${prev}\n❌ ${errorMessage}\n`);

			// 移动端网络环境更不稳定，提供重试选项
			const isMobile = window.innerWidth < 768;
			if (retryCount < (isMobile ? 3 : 2) && !error.message.includes("校验失败")) {
				const nextRetryCount = retryCount + 1;
				setRetryCount(nextRetryCount);
				setStreamContent(prev => `${prev}准备第 ${nextRetryCount} 次重试...\n`);

				setTimeout(() => {
					performAnalysis(true);
				}, 2000);
			} else {
				toast.error(errorMessage);
				console.error("分析失败:", error);
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
			return "text-green-600";
		if (score >= 60)
			return "text-yellow-600";
		return "text-red-600";
	};

	const getScoreBgColor = (score: number) => {
		if (score >= 80)
			return "bg-green-100";
		if (score >= 60)
			return "bg-yellow-100";
		return "bg-red-100";
	};

	return (
		<div className="min-h-screen from-slate-50 to-slate-100 bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-6 container max-w-7xl sm:py-8">
				{/* Header */}
				<WriterAnalysisHeader />

				{/* 主要内容区域 - 优化布局比例 */}
				<div className="mb-6 gap-6 grid lg:gap-8 lg:grid-cols-8">
					{/* 左侧：文章输入区 - 增加宽度 */}
					<div className="lg:col-span-5">
						<WriterAnalysisInput articleText={articleText} setArticleText={setArticleText} />
					</div>

					{/* 右侧：AI模型选择 - 减少宽度 */}
					<div className="lg:col-span-3">
						<WriterModelSelector
							availableModels={availableGradingModels}
							selectedModelId={selectedModelId}
							onModelChange={setSelectedModelId}
							disabled={isAnalyzing}
						/>
					</div>
				</div>

				{/* 评分模式区域 - 独立一行（原先为模型选择） */}
				<div className="mb-6">
					<WriterAnalysisModes
						evaluationModes={evaluationModes}
						selectedMode={selectedMode}
						isModesExpanded={isModesExpanded}
						setIsModesExpanded={setIsModesExpanded}
						handleModeChange={handleModeChange}
					/>
				</div>

				{/* 操作按钮区 - 优化UX体验 */}
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

				{/* Analysis Results */}
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

				{/* Streaming Display Modal */}
				<StreamingDisplay
					streamContent={streamContent}
					isVisible={showStreamingDisplay}
					onClose={() => {
						if (abortController) {
							abortController.abort();
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

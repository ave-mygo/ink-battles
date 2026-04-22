"use client";

import type { AnalysisResult, ScorePercentileResult } from "@ink-battles/shared/types/ai";
import type { GradingModelConfig } from "@ink-battles/shared/types/common/config";
import { BarChart3, BookOpen, Brain, Heart, PenTool, RefreshCw, Shield, Star, Target, Zap } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AnalysisResults } from "@/components/common/analysis/AnalysisResults";
import WriterAnalysisHeader from "@/components/layouts/WriterPage/WriterAnalysisHeader";
import WriterAnalysisInput from "@/components/layouts/WriterPage/WriterAnalysisInput";
import WriterAnalysisModes from "@/components/layouts/WriterPage/WriterAnalysisModes";
import WriterAnalysisResultPlaceholder from "@/components/layouts/WriterPage/WriterAnalysisResultPlaceholder";
import WriterModelSelector from "@/components/layouts/WriterPage/WriterModelSelector";
import { Button } from "@/components/ui/button";
import { getFingerprintId } from "@/lib/fingerprint";
import { useAvailableGradingModels } from "@/store/writer-config";
import { submitAnalysis } from "@/utils/analysis";
import { notifyBillingBalanceUpdated } from "@/utils/billing/client";

// 预编译正则表达式，避免每次调用时重新编译
const NEWLINE_REGEX = /\n/g;

/**
 * 获取搜索校验模型的展示名称。
 */
const getSearchModelDisplayName = (searchModel: "none" | "gemini" | "gemini-lite") => {
	if (searchModel === "gemini") {
		return "Gemini 搜索";
	}

	if (searchModel === "gemini-lite") {
		return "Gemini Lite 搜索";
	}

	return "关闭搜索";
};

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
	const availableGradingModels = useAvailableGradingModels();
	const [articleText, setArticleText] = useState("");
	const [selectedMode, setSelectedMode] = useState<string[]>([]);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
	const [currentAnalysisModelName, setCurrentAnalysisModelName] = useState<string>("");
	const [isModesExpanded, setIsModesExpanded] = useState(false);
	const [selectedModeName, setSelectedModeName] = useState<string[]>([]);
	const [analysisId, setAnalysisId] = useState<string | null>(null);
	const [searchInfo, setSearchInfo] = useState<{
		searchResults?: string;
		searchWebPages?: Array<{ uri: string; title?: string }>;
	} | null>(null);
	const [percentileData, setPercentileData] = useState<ScorePercentileResult | null>(null);
	const SEARCH_STORAGE_KEY = "writer.searchModel";
	const SEARCH_MODEL_DEFAULT = "none" as const;
	const validSearchModels = new Set(["none", "gemini", "gemini-lite"]);

	const searchModelSubscribe = (callback: () => void) => {
		if (typeof window === "undefined")
			return () => {};
		const onStorage = (e: StorageEvent) => {
			if (e.key === SEARCH_STORAGE_KEY)
				callback();
		};
		const onCustom = () => callback();
		window.addEventListener("storage", onStorage);
		window.addEventListener("writer-search-model-change", onCustom as EventListener);
		return () => {
			window.removeEventListener("storage", onStorage);
			window.removeEventListener("writer-search-model-change", onCustom as EventListener);
		};
	};
	const searchModelSnapshot = () => {
		try {
			if (typeof window !== "undefined") {
				const saved = window.localStorage.getItem(SEARCH_STORAGE_KEY);
				if (saved && validSearchModels.has(saved))
					return saved as "none" | "gemini" | "gemini-lite";
			}
		} catch {}
		return SEARCH_MODEL_DEFAULT;
	};
	const searchModelServerSnapshot = () => SEARCH_MODEL_DEFAULT;
	const searchModel = useSyncExternalStore(searchModelSubscribe, searchModelSnapshot, searchModelServerSnapshot);

	const setSearchModel = (model: "none" | "gemini" | "gemini-lite") => {
		try {
			if (typeof window !== "undefined") {
				window.localStorage.setItem(SEARCH_STORAGE_KEY, model);
				window.dispatchEvent(new Event("writer-search-model-change"));
			}
		} catch {}
	};
	// 缓存校验结果，重试时跳过校验
	const verifyResultRef = useRef<{
		session: string;
		fingerprint: string;
	} | null>(null);
	// 防抖 timer，用于文本长度检查
	const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

	// 防抖：当文本长度超过 3 万字时自动关闭搜索
	useEffect(() => {
		// 清除之前的 timer
		if (searchDebounceRef.current) {
			clearTimeout(searchDebounceRef.current);
		}

		// 设置新的防抖 timer（500ms 延迟）
		searchDebounceRef.current = setTimeout(() => {
			const TEXT_LIMIT = 30000;
			if (articleText.length > TEXT_LIMIT && searchModel !== "none") {
				setSearchModel("none");
				toast.info("文本长度超过3万字，已自动关闭联网搜索校验");
			}
		}, 500);

		// 清理函数
		return () => {
			if (searchDebounceRef.current) {
				clearTimeout(searchDebounceRef.current);
			}
		};
	// 仅依赖 articleText，不依赖 searchModel，避免用户手动开启时再次触发关闭
	}, [articleText]);
	const DEFAULT_INDEX = 2;
	const fallbackModelId = availableGradingModels[DEFAULT_INDEX]?.id
		?? availableGradingModels[0]?.id
		?? "";

	const STORAGE_KEY = "writer.selectedModelId";
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
				if (saved && availableGradingModels.some(model => model.id === saved))
					return saved;
				const legacyIndex = Number.parseInt(saved || "", 10);
				if (!Number.isNaN(legacyIndex)) {
					const legacyModelId = availableGradingModels[legacyIndex]?.id;
					if (legacyModelId)
						return legacyModelId;
				}
			}
		} catch { }
		return fallbackModelId;
	};
	const getServerSnapshot = () => fallbackModelId;
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
		setArticleText("");
		setSelectedMode([]);
		setSelectedModeName([]);
		setAnalysisResult(null);
		setSearchInfo(null);
		setPercentileData(null);
		setAnalysisId(null);
		verifyResultRef.current = null;
		toast.success("已清除所有内容");
	};

	const handleAnalyze = async () => {
		if (!articleText.trim()) {
			toast.error("请先输入要分析的作品内容");
			return;
		}

		// 新分析时清除缓存的校验结果
		verifyResultRef.current = null;
		setIsAnalyzing(true);

		try {
			const fingerprint = await getFingerprintId();
			const currentModel = availableGradingModels.find(model => model.id === selectedModelId);
			const currentModelName = currentModel?.id || "";
			const currentModelDisplayName = currentModel?.name || currentModelName || "默认模型";
			setCurrentAnalysisModelName(currentModelName);

			const res = await submitAnalysis({
				articleText,
				mode: selectedModeName.join(","),
				modelId: selectedModelId,
				fingerprint,
				searchModel,
			});

			if (!res.success || !res.taskId) {
				throw new Error(res.error || "提交任务失败");
			}

			toast.success("分析任务已提交后台处理");

			// Save to local storage for the placeholder to poll
			const activeTasksStr = localStorage.getItem("ink_battles_tasks");
			const activeTasks = activeTasksStr ? JSON.parse(activeTasksStr) : [];
			// Save simple title
			const titleMatch = articleText.substring(0, 20).replace(NEWLINE_REGEX, " ");
			activeTasks.push({
				taskId: res.taskId,
				title: titleMatch + (articleText.length > 20 ? "..." : ""),
				createdAt: Date.now(),
				modeName: selectedModeName.join(",") || "默认模式",
				modelName: currentModelDisplayName,
				searchModelName: getSearchModelDisplayName(searchModel),
				status: "pending",
				progress: res.progress,
			});
			localStorage.setItem("ink_battles_tasks", JSON.stringify(activeTasks));
			// Trigger a custom event so placeholder can re-render
			window.dispatchEvent(new Event("ink_battles_tasks_updated"));
			notifyBillingBalanceUpdated();

			// Clear text area to indicate successful submission
			setArticleText("");
		} catch (error) {
			console.error("启动分析失败:", error);
			toast.error((error as Error).message || "起动分析失败，请稍后重试");
		} finally {
			setIsAnalyzing(false);
		}
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
							searchModel={searchModel}
							onSearchModelChange={setSearchModel}
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
							<AnalysisResults
								analysisResult={analysisResult}
								searchInfo={searchInfo}
								modelName={currentAnalysisModelName}
								modeName={selectedModeName.join(",")}
								percentileData={percentileData}
								showShare
								showSponsor
								compactMode={true}
								analysisId={analysisId || undefined}
							/>
						)
					: (
							<WriterAnalysisResultPlaceholder />
						)}
			</div>
		</div>
	);
}

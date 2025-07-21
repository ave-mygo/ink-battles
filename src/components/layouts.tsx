"use client";

import type { AnalysisResult } from "@/lib/ai";
import { BarChart3, BookOpen, Brain, Heart, PenTool, RefreshCw, Star, Target, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import StreamingDisplay from "@/components/layouts/WriterPage/streaming-display";
import WriterAnalysisHeader from "@/components/layouts/WriterPage/WriterAnalysisHeader";
import WriterAnalysisInput from "@/components/layouts/WriterPage/WriterAnalysisInput";
import WriterAnalysisModes from "@/components/layouts/WriterPage/WriterAnalysisModes";
import WriterAnalysisResult from "@/components/layouts/WriterPage/WriterAnalysisResult";
import WriterAnalysisResultPlaceholder from "@/components/layouts/WriterPage/WriterAnalysisResultPlaceholder";
import { Button } from "@/components/ui/button";
import { verifyArticleValue } from "@/lib/ai";
import { db_insert_session } from "@/lib/utils-server";

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
];

export default function WriterAnalysisSystem() {
	const [articleText, setArticleText] = useState("");
	const [selectedMode, setSelectedMode] = useState("");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
	const [isModesExpanded, setIsModesExpanded] = useState(false);
	const [selectedModeName, setSelectedModeName] = useState("");
	const [streamContent, setStreamContent] = useState("");
	const [showStreamingDisplay, setShowStreamingDisplay] = useState(false);

	const handleModeChange = (modeId: string, checked: boolean, modeName: string) => {
		if (checked) {
			setSelectedMode(modeId);
			setSelectedModeName(modeName);
		} else if (selectedMode === modeId) {
			setSelectedMode("");
		}
	};

	const handleClear = () => {
		setArticleText("");
		setSelectedMode("");
		setSelectedModeName("");
		setAnalysisResult(null);
		setStreamContent("");
		setShowStreamingDisplay(false);
		toast.success("已清除所有内容");
	};

	const parseStreamedResult = (content: string): AnalysisResult | null => {
		try {
			// 尝试提取JSON内容
			const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const jsonStr = jsonMatch[1] || jsonMatch[0];
				return JSON.parse(jsonStr.trim());
			}

			// 如果没有找到JSON标记，尝试直接解析整个内容
			return JSON.parse(content.trim());
		} catch (error) {
			console.error("解析流式结果失败:", error);
			return null;
		}
	};

	const handleAnalyze = async () => {
		if (!articleText.trim()) {
			toast.error("请先输入要分析的作品内容");
			return;
		}

		setIsAnalyzing(true);
		setShowStreamingDisplay(true);
		setStreamContent(prev => `${prev}正在校验文章内容...\n`);

		// 验证文章内容
		const result = await verifyArticleValue(articleText);

		if (!result) {
			setStreamContent(prev => `${prev}校验未通过，无法进行分析。\n`);
			toast.error("文章具有激进的文学表达，无法进行分析");
			setIsAnalyzing(false);
			setTimeout(() => {
				setShowStreamingDisplay(false);
				setStreamContent("");
			}, 2000);
			return;
		}

		setStreamContent(prev => `${prev}校验通过，正在分析，分析过程可能需要几分钟...\n`);

		// 随机生成一个session
		const session = await db_insert_session();

		const apiKey = localStorage.getItem("ink_battles_token");

		try {
			// 使用简化的流式实现
			const response = await fetch("/api/analyze-stream", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Token": session,
					"X-Api-Key": apiKey || "",
				},
				body: JSON.stringify({
					articleText,
					mode: selectedModeName,
				}),
			});

			if (!response.ok) {
				throw new Error("分析请求失败");
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			let fullContent = "";

			if (reader) {
				while (true) {
					const { done, value } = await reader.read();
					if (done)
						break;

					const chunk = decoder.decode(value, { stream: true });
					fullContent += chunk;
					setStreamContent(prev => `${prev}${chunk}`);
				}
			}

			// 流式完成后，尝试解析结果
			const parsedResult = parseStreamedResult(fullContent);

			if (parsedResult) {
				setAnalysisResult(parsedResult);
				setStreamContent(prev => `${prev}\n分析完成。`);
				toast.success("分析完成");
			} else {
				setStreamContent(prev => `${prev}\n解析JSON失败，请重试。`);
				toast.error("解析分析结果失败，请重试");
			}
		} catch (error) {
			console.error("分析过程中出错:", error);
			setStreamContent(prev => `${prev}\n分析文章时出错。`);
			toast.error("分析文章时出错");
		} finally {
			setIsAnalyzing(false);
			setTimeout(() => {
				setShowStreamingDisplay(false);
				setStreamContent("");
			}, 5000);
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
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-6xl">
				{/* Header */}
				<WriterAnalysisHeader />

				<div className="mb-8 gap-8 grid lg:grid-cols-2">
					{/* Left Column - Article Input */}
					<WriterAnalysisInput articleText={articleText} setArticleText={setArticleText} />

					{/* Right Column - Evaluation Modes */}
					<WriterAnalysisModes
						evaluationModes={evaluationModes}
						selectedMode={selectedMode}
						isModesExpanded={isModesExpanded}
						setIsModesExpanded={setIsModesExpanded}
						handleModeChange={handleModeChange}
					/>
				</div>

				{/* Action Buttons */}
				<div className="mb-8 flex gap-4 justify-center">
					<Button
						onClick={handleAnalyze}
						disabled={isAnalyzing || !articleText.trim()}
						size="lg"
						className="bg-gradient-to-r text-lg font-medium px-8 py-3 shadow-lg from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
					>
						{isAnalyzing
							? (
									<>
										<Zap className="mr-2 h-5 w-5 animate-spin" />
										正在分析中...
									</>
								)
							: (
									<>
										<BarChart3 className="mr-2 h-5 w-5" />
										开始战力评测
									</>
								)}
					</Button>

					<Button
						onClick={handleClear}
						disabled={isAnalyzing}
						size="lg"
						variant="outline"
						className="text-lg font-medium px-8 py-3 bg-transparent shadow-lg"
					>
						<RefreshCw className="mr-2 h-5 w-5" />
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
					onClose={() => setShowStreamingDisplay(false)}
				/>
			</div>
		</div>
	);
}

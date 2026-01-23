"use client";

import type { GradingModelConfig } from "@/types/common/config";
import { AlertTriangle, Brain, Clock, Crown, Settings, Sparkles, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WriterModelSelectorProps {
	availableModels: GradingModelConfig[];
	selectedModelId: string;
	onModelChange: (modelId: string) => void;
	disabled?: boolean;
}

// 特性图标映射
const featureIcons: Record<string, React.ReactNode> = {
	更准确的评分: <Target className="mr-1 h-3 w-3" />,
	深度文本理解: <Brain className="mr-1 h-3 w-3" />,
	多维度分析: <Sparkles className="mr-1 h-3 w-3" />,
	快速响应: <Clock className="mr-1 h-3 w-3" />,
	基础评分: <Target className="mr-1 h-3 w-3" />,
	适合日常使用: <Zap className="mr-1 h-3 w-3" />,
};

export default function WriterModelSelector({
	availableModels,
	selectedModelId,
	onModelChange,
	disabled = false,
}: WriterModelSelectorProps) {
	const selectedModel = availableModels.find(model => model.id === selectedModelId);

	return (
		<Card className="border-0 bg-white/80 flex flex-col h-full shadow-lg backdrop-blur-sm dark:bg-slate-900/40">
			<CardHeader className="pb-4">
				<CardTitle className="flex gap-2 items-center">
					<Brain className="text-blue-600 h-5 w-5 dark:text-blue-300" />
					AI评分模型
				</CardTitle>
				<CardDescription className="dark:text-slate-300">
					选择适合的AI模型进行文章分析评分
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col">
				{/* 竖直布局：上方选择器 + 下方详细信息 */}
				<div className="flex flex-1 flex-col space-y-4">
					{/* 上方：模型选择器 */}
					<div className="space-y-2">
						<label htmlFor="model-select" className="text-sm text-slate-700 font-medium dark:text-slate-300">
							选择模型
						</label>
						<Select
							value={selectedModelId}
							onValueChange={onModelChange}
							disabled={disabled}
						>
							<SelectTrigger className="w-full focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-400">
								<SelectValue placeholder="请选择评分模型" />
							</SelectTrigger>
							<SelectContent>
								{availableModels.map(model => (
									<SelectItem key={model.id} value={model.id}>
										<div className="flex gap-2 w-full items-center">
											<div className="flex flex-1 gap-2 items-center">
												{model.premium && <Crown className="text-yellow-600 h-3 w-3" />}
												<span className="font-medium">{model.name}</span>
												{model.premium && (
													<Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
														高级
													</Badge>
												)}
											</div>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* 下方：选中模型的详细信息 - 简化版本 */}
					<div className="flex flex-1 flex-col">
						{
							selectedModel
								? (
										<div className="p-4 border border-blue-200/50 rounded-lg flex flex-1 flex-col from-blue-50/60 to-indigo-50/60 bg-linear-to-r dark:border-blue-800/50 dark:from-blue-950/30 dark:to-indigo-950/30">
											<div className="mb-3 flex gap-3 items-start">
												<div className={`p-2 rounded-lg ${selectedModel.premium
													? "bg-linear-to-r from-yellow-100 to-orange-100 text-yellow-700 dark:from-yellow-900/30 dark:to-orange-900/30 dark:text-yellow-300"
													: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
												}`}
												>
													{selectedModel.premium ? <Crown className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
												</div>
												<div className="flex-1 min-w-0">
													<div className="mb-1 flex gap-2 items-center">
														<h3 className="text-slate-900 font-semibold dark:text-slate-100">
															{selectedModel.name}
														</h3>
														{selectedModel.premium && (
															<Badge className="text-xs text-white from-yellow-500 to-orange-500 bg-linear-to-r">
																高级模型
															</Badge>
														)}
													</div>
													<p className="text-sm text-slate-600 dark:text-slate-300">
														{selectedModel.description}
													</p>
												</div>
											</div>

											{/* 特性标签 */}
											<div className="mb-3">
												<div className="flex flex-wrap gap-1.5">
													{selectedModel.features.map((feature, index) => (
														<Badge
															key={index}
															variant="outline"
															className={`text-xs ${selectedModel.premium
																? index === 0
																	? "text-green-600 border-green-300 dark:text-green-400 dark:border-green-800"
																	: index === 1
																		? "text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-800"
																		: "text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-800"
																: index === 0
																	? "text-green-600 border-green-300 dark:text-green-400 dark:border-green-800"
																	: index === 1
																		? "text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-800"
																		: "text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-600"
															}`}
														>
															{featureIcons[feature]}
															{feature}
														</Badge>
													))}
												</div>
											</div>

										<div className="flex flex-1 flex-col justify-between">
											<div className="text-xs text-slate-600 dark:text-slate-400">
												{selectedModel.usageScenario}
											</div>
										</div>
										
										{/* 隐私警告 - 独立显示区域 */}
										{selectedModel.warning && (
											<div className="mt-3 p-3 border-2 border-orange-400 rounded-lg bg-orange-50 shadow-sm dark:border-orange-600 dark:bg-orange-950/50">
												<div className="flex gap-2 items-start">
													<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
													<p className="text-sm text-orange-800 font-medium leading-relaxed dark:text-orange-200">
														{selectedModel.warning}
													</p>
												</div>
											</div>
										)}
									</div>
								)
								: (
										<div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-1 items-center justify-center dark:border-slate-700 dark:bg-slate-800/30">
											<p className="text-sm text-slate-500 dark:text-slate-400">
												请选择一个AI模型来查看详细信息
											</p>
										</div>
									)
						}
					</div>
				</div>

				{/* 底部说明 - 简化 */}
				<div className="text-xs text-slate-500 mt-3 pt-3 border-t space-y-1 dark:text-slate-400 dark:border-slate-700">
					<div className="flex gap-1 items-center">
						<Settings className="h-3 w-3" />
						<span>所有模型均支持多种评分模式和维度分析</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

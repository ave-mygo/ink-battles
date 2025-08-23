"use client";
import type React from "react";
import { ChevronDown, ChevronUp, CircleQuestionMark, Gauge, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Switch } from "@/components/ui/switch";

interface Mode {
	id: string;
	name: string;
	description: string;
	text: string;
	icon: React.ReactNode;
}

interface WriterAnalysisModesProps {
	evaluationModes: Mode[];
	selectedMode: string[];
	isModesExpanded: boolean;
	setIsModesExpanded: (v: boolean) => void;
	handleModeChange: (modeId: string, checked: boolean, modeName: string) => void;
}

export default function WriterAnalysisModes({
	evaluationModes,
	selectedMode,
	isModesExpanded,
	setIsModesExpanded,
	handleModeChange,
}: WriterAnalysisModesProps) {
	return (
		<Card className="border-0 bg-white/80 h-full w-full shadow-lg backdrop-blur-sm">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<Gauge className="text-blue-600 h-5 w-5" />
					评分模式（可选）
				</CardTitle>
				<CardDescription>选择适合的评分视角，不同模式将采用不同的评判标准</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{evaluationModes.slice(0, 4).map((mode) => {
					const isAiDetection = mode.id === "ai-detection";
					const isLocked = isAiDetection; // 永久锁定AI鉴别师

					return (
						<div
							key={mode.id}
							className={`p-4 border-2 rounded-lg w-full transition-all duration-200 ${
								selectedMode.includes(mode.id)
									? "border-blue-500 bg-blue-50"
									: isLocked
										? "border-slate-200 bg-slate-50 opacity-60"
										: "border-slate-200 hover:border-slate-300"
							}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex gap-3 items-center">
									<div
										className={`p-2 rounded-lg ${
											selectedMode.includes(mode.id) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
										}`}
									>
										{isLocked ? <Lock className="h-4 w-4" /> : mode.icon}
									</div>
									<div>
										<div className="flex gap-2 items-center">
											<span className="text-slate-800 font-medium">{mode.name}</span>
											{isLocked && (
												<Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
													等待后续迭代开放使用
												</Badge>
											)}
											<HoverCard>
												<HoverCardTrigger>
													<CircleQuestionMark className="text-slate-500 h-3 w-3" />
												</HoverCardTrigger>
												<HoverCardContent>
													<ul className="pl-6 list-disc space-y-2">
														{mode.text.split("-").map((line, index) => (
															<li key={index}>{line}</li>
														))}
													</ul>
												</HoverCardContent>
											</HoverCard>
											{selectedMode.includes(mode.id) && (
												<Badge variant="default" className="bg-blue-600">
													已选择
												</Badge>
											)}
										</div>
										<p className="text-sm text-slate-600 mt-1">{mode.description}</p>
									</div>
								</div>
								{isLocked
									? (
											<div className="flex gap-2 items-center">
												<Badge variant="secondary" className="text-slate-600">
													开发中
												</Badge>
											</div>
										)
									: (
											<Switch
												checked={selectedMode.includes(mode.id)}
												onCheckedChange={checked => handleModeChange(mode.id, checked, mode.name)}
											/>
										)}
							</div>
						</div>
					);
				})}

				{/* 可展开的额外模式 */}
				<div
					className={`transition-all duration-500 ease-out overflow-hidden ${
						isModesExpanded
							? "max-h-[2000px] opacity-100"
							: "max-h-0 opacity-0"
					}`}
				>
					<div className="pt-2 space-y-4">
						{evaluationModes.slice(4).map((mode) => {
							const isAiDetection = mode.id === "ai-detection";
							const isLocked = isAiDetection; // 永久锁定AI鉴别师

							return (
								<div
									key={mode.id}
									className={`p-4 border-2 rounded-lg w-full transform transition-all duration-200 ${
										isModesExpanded
											? "translate-y-0 opacity-100"
											: "translate-y-2 opacity-0"
									}  ${
										selectedMode.includes(mode.id)
											? "border-blue-500 bg-blue-50"
											: isLocked
												? "border-slate-200 bg-slate-50 opacity-60"
												: "border-slate-200 hover:border-slate-300"
									}`}
									style={{
										transitionDelay: isModesExpanded ? `${evaluationModes.slice(4).indexOf(mode) * 50}ms` : "0ms",
									}}
								>
									<div className="flex items-center justify-between">
										<div className="flex gap-3 items-center">
											<div
												className={`p-2 rounded-lg ${
													selectedMode.includes(mode.id) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
												}`}
											>
												{isLocked ? <Lock className="h-4 w-4" /> : mode.icon}
											</div>
											<div>
												<div className="flex gap-2 items-center">
													<span className="text-slate-800 font-medium">{mode.name}</span>
													{isLocked && (
														<Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
															等待后续迭代开放使用
														</Badge>
													)}
													<HoverCard>
														<HoverCardTrigger>
															<CircleQuestionMark className="text-slate-500 h-3 w-3" />
														</HoverCardTrigger>
														<HoverCardContent>
															<ul className="pl-6 list-disc space-y-2">
																{mode.text.split("-").map((line, index) => (
																	<li key={index}>{line}</li>
																))}
															</ul>
														</HoverCardContent>
													</HoverCard>
													{selectedMode.includes(mode.id) && (
														<Badge variant="default" className="bg-blue-600">
															已选择
														</Badge>
													)}
												</div>
												<p className="text-sm text-slate-600 mt-1">{mode.description}</p>
											</div>
										</div>
										{isLocked
											? (
													<div className="flex gap-2 items-center">
														<Badge variant="secondary" className="text-slate-600">
															开发中
														</Badge>
													</div>
												)
											: (
													<Switch
														checked={selectedMode.includes(mode.id)}
														onCheckedChange={checked => handleModeChange(mode.id, checked, mode.name)}
													/>
												)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<Button
					variant="ghost"
					className="text-slate-600 w-full transition-all duration-200 hover:text-blue-600"
					onClick={() => setIsModesExpanded(!isModesExpanded)}
				>
					{isModesExpanded
						? (
								<>
									<ChevronUp className={`mr-2 h-4 w-4 transition-transform duration-200 ${
										isModesExpanded ? "rotate-180" : "rotate-0"
									}`}
									/>
									收起更多模式
								</>
							)
						: (
								<>
									<ChevronDown className={`mr-2 h-4 w-4 transition-transform duration-200 ${
										isModesExpanded ? "rotate-180" : "rotate-0"
									}`}
									/>
									展开更多模式 (
									{evaluationModes.length - 4}
									)
								</>
							)}
				</Button>
			</CardContent>
		</Card>
	);
}

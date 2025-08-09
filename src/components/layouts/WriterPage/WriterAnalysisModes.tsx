"use client";
import type React from "react";
import { ChevronDown, ChevronUp, CircleQuestionMark, Gauge, Lock, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
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
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

	// 检查用户登录状态
	useEffect(() => {
		const checkLoginStatus = async () => {
			try {
				const response = await fetch("/api/auth/me", {
					credentials: "include",
				});
				setIsLoggedIn(response.ok);
			} catch (error) {
				console.error("检查登录状态失败:", error);
				setIsLoggedIn(false);
			}
		};

		checkLoginStatus();
	}, []);
	return (
		<Card className="mx-auto border-0 bg-white/80 h-full max-w-2xl w-full shadow-lg backdrop-blur-sm">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<Gauge className="text-blue-600 h-5 w-5" />
					评分模式（可选）
				</CardTitle>
				<CardDescription>选择适合的评分视角，不同模式将采用不同的评判标准</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{evaluationModes.slice(0, isModesExpanded ? undefined : 4).map((mode) => {
					const isAiDetection = mode.id === "ai-detection";
					const isLocked = isAiDetection && !isLoggedIn;

					return (
						<div
							key={mode.id}
							className={`p-4 rounded-lg border-2 transition-all duration-200 w-full ${
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
												<Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
													需要登录
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
												<Button
													size="sm"
													variant="outline"
													className="text-blue-600 border-blue-300 hover:bg-blue-50"
													onClick={() => window.location.href = "/signin"}
												>
													<LogIn className="mr-1 h-3 w-3" />
													去登录
												</Button>
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

				<Button
					variant="ghost"
					className="text-slate-600 w-full hover:text-blue-600"
					onClick={() => setIsModesExpanded(!isModesExpanded)}
				>
					{isModesExpanded
						? (
								<>
									<ChevronUp className="mr-2 h-4 w-4" />
									收起更多模式
								</>
							)
						: (
								<>
									<ChevronDown className="mr-2 h-4 w-4" />
									展开更多模式 (
									{evaluationModes.length - 3}
									)
								</>
							)}
				</Button>
			</CardContent>
		</Card>
	);
}

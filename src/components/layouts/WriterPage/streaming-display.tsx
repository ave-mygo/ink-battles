"use client";

import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StreamingDisplayProps {
	streamContent: string;
	isVisible: boolean;
	onClose: () => void;
}

export default function StreamingDisplay({ streamContent, isVisible, onClose }: StreamingDisplayProps) {
	if (!isVisible)
		return null;

	return (
		<div className="p-4 bg-black/50 flex items-center inset-0 justify-center fixed z-50 backdrop-blur-sm">
			<Card className="bg-white max-h-[80vh] max-w-4xl w-full shadow-2xl">
				<CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
					<CardTitle className="flex gap-2 items-center">
						<Zap className="text-blue-600 h-5 w-5 animate-pulse" />
						AI 正在分析中...
					</CardTitle>
					<Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
						<X className="h-4 w-4" />
					</Button>
				</CardHeader>
				<CardContent>
					<ScrollArea className="h-[60vh] w-full">
						<div className="space-y-2">
							<div className="text-sm text-slate-600 mb-4">实时输出流：</div>
							<div className="text-sm font-mono p-4 rounded-lg bg-slate-50 whitespace-pre-wrap">
								{streamContent}
								<span className="ml-1 bg-blue-600 h-4 w-2 inline-block animate-pulse" />
							</div>
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	);
}

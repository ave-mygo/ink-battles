"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function WriterAnalysisResultPlaceholder() {
	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
			<CardContent className="py-12 text-center">
				<div className="text-slate-400 mb-4">
					<BarChart3 className="mx-auto h-16 w-16" />
				</div>
				<h3 className="text-lg text-slate-600 font-medium mb-2">等待分析</h3>
				<p className="text-slate-500">请输入作品内容并点击"开始战力评测"按钮</p>
			</CardContent>
		</Card>
	);
}

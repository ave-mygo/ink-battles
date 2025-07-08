"use client";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface WriterAnalysisInputProps {
	articleText: string;
	setArticleText: (text: string) => void;
}

export default function WriterAnalysisInput({ articleText, setArticleText }: WriterAnalysisInputProps) {
	return (
		<Card className="border-0 bg-white/80 h-full shadow-lg backdrop-blur-sm">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<FileText className="text-blue-600 h-5 w-5" />
					作品输入
				</CardTitle>
				<CardDescription>请粘贴您要分析的完整作品内容，支持小说、散文、诗歌等各类文体</CardDescription>
			</CardHeader>
			<CardContent>
				<Textarea
					placeholder="请在此处粘贴要分析的作品全文..."
					value={articleText}
					onChange={e => setArticleText(e.target.value)}
					className="text-base leading-relaxed border-slate-200 min-h-[400px] resize-y focus:border-blue-500 focus:ring-blue-500/20"
				/>
				<div className="text-sm text-slate-500 mt-2">
					字数统计:
					{articleText.length}
					{" "}
					字
				</div>
			</CardContent>
		</Card>
	);
}

import { Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SearchCredentialsProps {
	searchResults: string;
	searchWebPages?: Array<{ uri: string; title?: string }>;
}

/**
 * 搜索凭证展示组件
 * 显示AI搜索到的背景资料总结和参考来源网页列表
 */
export function SearchCredentials({ searchResults, searchWebPages }: SearchCredentialsProps) {
	return (
		<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<Search className="text-blue-600 h-5 w-5" />
					搜索凭据
				</CardTitle>
				<CardDescription>
					AI 在分析前搜索到的背景资料总结
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="text-slate-800 p-4 border border-blue-100 rounded-lg bg-blue-50/50 whitespace-pre-wrap dark:text-slate-200 dark:border-blue-900 dark:bg-blue-950/30">
					{searchResults}
				</div>

				{/* 搜索使用的网页列表 */}
				{searchWebPages && searchWebPages.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-sm text-slate-700 font-medium dark:text-slate-300">
							参考来源 (
							{searchWebPages.length}
							{" "}
							个网页)
						</h4>
						<div className="space-y-2">
							{searchWebPages.map((page, index) => (
								<a
									key={index}
									href={page.uri}
									target="_blank"
									rel="noopener noreferrer"
									className="p-3 border border-blue-100 rounded-lg bg-white flex gap-2 cursor-pointer transition-colors items-start dark:border-blue-900 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50"
								>
									<span className="text-xs text-blue-600 font-medium shrink-0 dark:text-blue-400">
										{index + 1}
									</span>
									<div className="flex-1 min-w-0">
										{page.title && (
											<div className="text-sm text-slate-800 font-medium line-clamp-1 dark:text-slate-200">
												{page.title}
											</div>
										)}
										<div className="text-xs text-slate-500 break-all dark:text-slate-400">
											{page.uri}
										</div>
									</div>
								</a>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

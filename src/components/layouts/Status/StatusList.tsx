import type { StatusListProps } from "@/types/common/status";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

function TableSkeleton() {
	return (
		<Card className="border-0 shadow-lg overflow-hidden">
			<CardHeader>
				<div className="flex gap-2 items-center">
					<Skeleton className="rounded h-5 w-5" />
					<Skeleton className="h-6 w-32" />
				</div>
				<Skeleton className="h-4 w-48" />
			</CardHeader>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								{["时间", "模型", "输入Token", "输出Token", "响应时间", "消耗配额", "状态"].map(header => (
									<TableHead key={header} className="whitespace-nowrap">
										<Skeleton className="h-4 w-16" />
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 8 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell><Skeleton className="h-4 w-32" /></TableCell>
									<TableCell><Skeleton className="h-4 w-24" /></TableCell>
									<TableCell><Skeleton className="h-4 w-16" /></TableCell>
									<TableCell><Skeleton className="h-4 w-16" /></TableCell>
									<TableCell><Skeleton className="h-4 w-12" /></TableCell>
									<TableCell><Skeleton className="h-4 w-12" /></TableCell>
									<TableCell><Skeleton className="rounded-full h-6 w-12" /></TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

export default function StatusList({ logs, loading = false }: StatusListProps) {
	if (loading) {
		return <TableSkeleton />;
	}

	if (!logs.length) {
		return (
			<Card className="border-0 shadow-lg">
				<CardContent className="py-16 text-center">
					<h3 className="text-xl text-slate-700 font-semibold mb-2">暂无使用记录</h3>
					<p className="text-slate-500">系统使用数据将在这里显示</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="border-0 shadow-lg overflow-hidden from-white to-slate-50 bg-gradient-to-br">
			<CardHeader>
				<CardTitle className="text-slate-800 flex gap-2 items-center">
					<Database className="text-emerald-600 h-5 w-5" />
					API 使用记录
				</CardTitle>
				<CardDescription>
					最近的系统API调用详情和性能数据
				</CardDescription>
			</CardHeader>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="bg-slate-50 hover:bg-slate-100">
								<TableHead className="text-slate-700 font-semibold whitespace-nowrap">时间</TableHead>
								<TableHead className="text-slate-700 font-semibold whitespace-nowrap">模型</TableHead>
								<TableHead className="text-slate-700 font-semibold whitespace-nowrap">输入Token</TableHead>
								<TableHead className="text-slate-700 font-semibold whitespace-nowrap">输出Token</TableHead>
								<TableHead className="text-slate-700 font-semibold whitespace-nowrap">响应时间</TableHead>
								<TableHead className="text-slate-700 font-semibold whitespace-nowrap">消耗配额</TableHead>
								<TableHead className="text-slate-700 font-semibold whitespace-nowrap">状态</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{logs.map((log, index) => {
								const isSuccess = log.quota > 0;
								const isRecent = index < 5;

								return (
									<TableRow
										key={log.created_at}
										className={`transition-all duration-200 hover:bg-slate-50 ${
											isRecent ? "bg-gradient-to-r from-emerald-50/50 to-transparent" : ""
										}`}
									>
										<TableCell className="text-sm font-mono whitespace-nowrap">
											{format(new Date(log.created_at * 1000), "MM-dd HH:mm:ss")}
										</TableCell>
										<TableCell className="whitespace-nowrap">
											<span className="text-xs text-blue-800 font-medium px-2 py-1 rounded-md bg-blue-100">
												{log.model_name}
											</span>
										</TableCell>
										<TableCell className="text-center whitespace-nowrap">
											<span className="text-sm font-mono">
												{log.prompt_tokens.toLocaleString()}
											</span>
										</TableCell>
										<TableCell className="text-center whitespace-nowrap">
											<span className="text-sm font-mono">
												{log.completion_tokens.toLocaleString()}
											</span>
										</TableCell>
										<TableCell className="text-center whitespace-nowrap">
											<span className={`text-sm font-mono px-2 py-1 rounded-md ${
												log.use_time < 1000
													? "bg-green-100 text-green-800"
													: log.use_time < 3000
														? "bg-yellow-100 text-yellow-800"
														: "bg-red-100 text-red-800"
											}`}
											>
												{log.use_time}
												ms
											</span>
										</TableCell>
										<TableCell className="text-center whitespace-nowrap">
											<span className="text-sm font-mono">
												{log.quota}
											</span>
										</TableCell>
										<TableCell>
											<span
												className={`text-xs font-semibold px-3 py-1 rounded-full inline-flex gap-1 transition-all duration-200 items-center ${
													isSuccess
														? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
														: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200"
												}`}
											>
												{isSuccess
													? (
															<>
																<CheckCircle className="h-3 w-3" />
																成功
															</>
														)
													: (
															<>
																<AlertCircle className="h-3 w-3" />
																失败
															</>
														)}
											</span>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}

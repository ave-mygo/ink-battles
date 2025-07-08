import type { UsageLog } from "@/types/status";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface StatusListProps {
	logs: UsageLog[];
}

export default function StatusList({ logs }: StatusListProps) {
	return (
		<Card className="overflow-hidden">
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="whitespace-nowrap">时间</TableHead>
							<TableHead className="whitespace-nowrap">模型</TableHead>
							<TableHead className="whitespace-nowrap">输入Token</TableHead>
							<TableHead className="whitespace-nowrap">输出Token</TableHead>
							<TableHead className="whitespace-nowrap">响应时间</TableHead>
							<TableHead className="whitespace-nowrap">消耗配额</TableHead>
							<TableHead className="whitespace-nowrap">状态</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{logs.map(log => (
							<TableRow key={log.created_at}>
								<TableCell className="whitespace-nowrap">
									{format(new Date(log.created_at * 1000), "yyyy-MM-dd HH:mm:ss")}
								</TableCell>
								<TableCell className="whitespace-nowrap">{log.model_name}</TableCell>
								<TableCell className="whitespace-nowrap">{log.prompt_tokens}</TableCell>
								<TableCell className="whitespace-nowrap">{log.completion_tokens}</TableCell>
								<TableCell className="whitespace-nowrap">
									{log.use_time}
									ms
								</TableCell>
								<TableCell className="whitespace-nowrap">{log.quota}</TableCell>
								<TableCell>
									<span
										className={`px-2 py-1 rounded-full text-xs ${
											log.quota > 0
												? "bg-green-100 text-green-800"
												: "bg-red-100 text-red-800"
										}`}
									>
										{log.quota > 0 ? "成功" : "失败"}
									</span>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</Card>
	);
}

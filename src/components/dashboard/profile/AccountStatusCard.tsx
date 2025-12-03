import type { AuthUserInfoSafe } from "@/types/users/user";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountStatusCardProps {
	user: AuthUserInfoSafe;
}

export function AccountStatusCard({ user }: AccountStatusCardProps) {
	const formatDate = (dateString: string | null | undefined): string => {
		if (!dateString)
			return "未知";
		return new Date(dateString).toLocaleDateString("zh-CN", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<Card className="border-0 bg-white/80 h-full shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<Calendar className="text-blue-600 h-5 w-5" />
					账号状态
				</CardTitle>
				<CardDescription>您的账号活动信息</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 创建时间 */}
				<div className="p-4 border border-slate-200/40 rounded-xl bg-white/5 flex items-center justify-between backdrop-blur-sm dark:border-slate-700/50 dark:bg-white/5">
					<div>
						<p className="text-sm text-slate-900 font-medium dark:text-slate-100">
							注册时间
						</p>
						<p className="text-sm text-slate-600 dark:text-slate-400">
							账号创建日期
						</p>
					</div>
					<span className="text-slate-900 dark:text-slate-100">
						{formatDate(user.createdAt)}
					</span>
				</div>

				{/* 更新时间 */}
				{user.updatedAt && (
					<div className="p-4 border border-slate-200/40 rounded-xl bg-white/5 flex items-center justify-between backdrop-blur-sm dark:border-slate-700/50 dark:bg-white/5">
						<div>
							<p className="text-sm text-slate-900 font-medium dark:text-slate-100">
								最后更新
							</p>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								账号信息最后修改时间
							</p>
						</div>
						<span className="text-slate-900 dark:text-slate-100">
							{formatDate(user.updatedAt)}
						</span>
					</div>
				)}

				{/* 账号状态 */}
				<div className="p-4 border border-slate-200/40 rounded-xl bg-white/5 flex items-center justify-between backdrop-blur-sm dark:border-slate-700/50 dark:bg-white/5">
					<div>
						<p className="text-sm text-slate-900 font-medium dark:text-slate-100">
							账号状态
						</p>
						<p className="text-sm text-slate-600 dark:text-slate-400">
							当前账号的活动状态
						</p>
					</div>
					<Badge variant={user.isActive ? "default" : "destructive"}>
						{user.isActive ? "正常" : "已停用"}
					</Badge>
				</div>
			</CardContent>
		</Card>
	);
}

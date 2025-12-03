import type { AuthUserInfoSafe } from "@/types/users/user";
import { Mail, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BasicInfoCardProps {
	user: AuthUserInfoSafe;
}

export function BasicInfoCard({ user }: BasicInfoCardProps) {
	const getLoginMethodBadge = (method?: "email" | "qq" | "afd" | null) => {
		if (!method)
			return null;

		const configs = {
			email: { label: "邮箱登录", variant: "default" as const },
			qq: { label: "QQ 登录", variant: "secondary" as const },
			afd: { label: "爱发电 登录", variant: "secondary" as const },
		};

		const config = configs[method];
		return <Badge variant={config.variant}>{config.label}</Badge>;
	};

	return (
		<Card className="border-0 bg-white/80 h-full shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
			<CardHeader>
				<CardTitle className="flex gap-2 items-center">
					<User className="text-blue-600 h-5 w-5" />
					基本信息
				</CardTitle>
				<CardDescription>您的账号基本信息</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 用户 UID */}
				<div className="p-4 border border-slate-200/40 rounded-xl bg-white/5 flex items-center justify-between backdrop-blur-sm dark:border-slate-700/50 dark:bg-white/5">
					<div className="flex gap-3 items-center">
						<Shield className="text-slate-500 h-5 w-5" />
						<div>
							<p className="text-sm text-slate-900 font-medium dark:text-slate-100">
								用户 ID
							</p>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								您的唯一标识符
							</p>
						</div>
					</div>
					<span className="text-slate-900 font-mono font-semibold dark:text-slate-100">
						{user.uid}
					</span>
				</div>

				{/* 邮箱地址 */}
				{user.email && (
					<div className="p-4 border border-slate-200/40 rounded-xl bg-white/5 flex items-center justify-between backdrop-blur-sm dark:border-slate-700/50 dark:bg-white/5">
						<div className="flex gap-3 items-center">
							<Mail className="text-slate-500 h-5 w-5" />
							<div>
								<p className="text-sm text-slate-900 font-medium dark:text-slate-100">
									邮箱地址
								</p>
								<p className="text-sm text-slate-600 dark:text-slate-400">
									用于登录和通知
								</p>
							</div>
						</div>
						<span className="text-slate-900 dark:text-slate-100">
							{user.email}
						</span>
					</div>
				)}

				{/* 登录方式 */}
				<div className="p-4 border border-slate-200/40 rounded-xl bg-white/5 flex items-center justify-between backdrop-blur-sm dark:border-slate-700/50 dark:bg-white/5">
					<div className="flex gap-3 items-center">
						<User className="text-slate-500 h-5 w-5" />
						<div>
							<p className="text-sm text-slate-900 font-medium dark:text-slate-100">
								登录方式
							</p>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								当前使用的登录方式
							</p>
						</div>
					</div>
					{getLoginMethodBadge(user.loginMethod)}
				</div>
			</CardContent>
		</Card>
	);
}

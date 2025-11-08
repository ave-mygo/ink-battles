import type { Metadata } from "next";
import { Calendar, Mail, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardUserInfo } from "@/utils/dashboard";

/**
 * 用户信息页面元数据
 */
export const metadata: Metadata = {
	title: "账户管理",
	description: "查看和管理您的账户信息、登录方式、安全设置与账户绑定。",
};

/**
 * 格式化日期
 */
const formatDate = (dateString: string | null | undefined): string => {
	if (!dateString)
		return "未知";
	return new Date(dateString).toLocaleDateString("zh-CN", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

/**
 * 获取登录方式标签
 */
const getLoginMethodBadge = (method?: "email" | "qq" | null) => {
	if (!method)
		return null;

	const configs = {
		email: { label: "邮箱登录", variant: "default" as const },
		qq: { label: "QQ 登录", variant: "secondary" as const },
	};

	const config = configs[method];
	return <Badge variant={config.variant}>{config.label}</Badge>;
};

/**
 * 用户信息页面
 */
export default async function ProfilePage() {
	const user = await getDashboardUserInfo();

	if (!user) {
		return (
			<div className="flex h-full items-center justify-center">
				<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-lg">
					<CardContent className="pt-6">
						<p className="text-slate-600">无法加载用户信息</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	/**
	 * 获取用户显示名称
	 */
	const getUserDisplayName = () => {
		if (user.email) {
			return user.email.split("@")[0];
		}
		return `用户 ${user.uid}`;
	};

	/**
	 * 获取用户头像 URL
	 */
	const getUserAvatar = () => {
		return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
	};

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			{/* 页面标题 */}
			<div className="mb-2 flex gap-3 items-center">
				<div className="rounded-xl flex h-10 w-10 shadow-md items-center justify-center from-blue-500 to-indigo-600 bg-linear-to-br dark:from-blue-700 dark:to-indigo-700">
					<User className="text-white h-5 w-5" />
				</div>
				<div>
					<h1 className="text-2xl text-slate-900 font-bold md:text-3xl dark:text-slate-100">用户信息</h1>
					<p className="text-slate-600 mt-1 dark:text-slate-400">查看和管理您的个人资料</p>
				</div>
			</div>

			{/* 用户头像卡片 */}
			<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-lg">
				<CardContent className="pt-6">
					<div className="flex flex-col gap-4 items-center sm:flex-row sm:gap-6">
						<img
							src={getUserAvatar()}
							alt={getUserDisplayName()}
							className="rounded-full h-24 w-24 ring-4 ring-slate-200 dark:ring-slate-700"
						/>
						<div className="flex flex-col gap-2 items-center sm:items-start">
							<h2 className="text-2xl text-slate-900 font-bold dark:text-slate-100">
								{getUserDisplayName()}
							</h2>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								UID:
								{" "}
								{user.uid}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 基本信息卡片 */}
			<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-lg">
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

			{/* 账号状态卡片 */}
			<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-lg">
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
		</div>
	);
}

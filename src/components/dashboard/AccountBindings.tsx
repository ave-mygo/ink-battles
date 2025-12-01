"use client";

import type { FC } from "react";
import { Icon } from "@iconify/react";
import { Link2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bindEmailAccount, unbindAfdianAccount, unbindEmailAccount, unbindQQAccount } from "@/utils/dashboard/account-bindings";

interface AccountBindingsProps {
	bindings: {
		email: { bound: boolean; value?: string | null };
		qq: { bound: boolean; value?: string | null };
		afdian: { bound: boolean; value?: string | null };
		loginMethod?: "email" | "qq" | "afd" | null;
	};
}

/**
 * 账号绑定组件
 */
export const AccountBindings: FC<AccountBindingsProps> = ({ bindings }) => {
	const router = useRouter();
	const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
	const [showEmailDialog, setShowEmailDialog] = useState(false);
	const [emailForm, setEmailForm] = useState({ email: "", password: "" });

	const [unbindConfirm, setUnbindConfirm] = useState<{
		open: boolean;
		type: "email" | "qq" | "afdian" | null;
	}>({ open: false, type: null });

	/**
	 * 执行解绑操作
	 */
	const executeUnbind = async () => {
		const { type } = unbindConfirm;
		if (!type) {
			return;
		}

		setLoading(prev => ({ ...prev, [type]: true }));
		try {
			let result;
			switch (type) {
				case "qq":
					result = await unbindQQAccount();
					break;
				case "email":
					result = await unbindEmailAccount();
					break;
				case "afdian":
					result = await unbindAfdianAccount();
					break;
				default:
					return;
			}

			if (result?.success) {
				toast.success(result.message);
				// 刷新页面以更新绑定状态
				router.refresh();
			} else {
				toast.error(result?.message || "操作失败");
			}
		} catch {
			toast.error("解绑失败，请稍后重试");
		} finally {
			setLoading(prev => ({ ...prev, [type]: false }));
			setUnbindConfirm({ open: false, type: null });
		}
	};

	/**
	 * 处理 QQ 绑定
	 */
	const handleQQBind = () => {
		// 跳转到统一 QQ OAuth 入口，携带 method=bind
		router.push("/oauth/qq?method=bind");
	};

	/**
	 * 处理 QQ 解绑
	 */
	const handleQQUnbind = () => {
		setUnbindConfirm({ open: true, type: "qq" });
	};

	/**
	 * 处理邮箱绑定
	 */
	const handleEmailBind = async () => {
		if (!emailForm.email) {
			toast.error("请输入邮箱地址");
			return;
		}

		setLoading({ ...loading, email: true });
		try {
			const result = await bindEmailAccount(emailForm.email, emailForm.password || undefined);
			if (result.success) {
				toast.success(result.message);
				setShowEmailDialog(false);
				setEmailForm({ email: "", password: "" });
				// 刷新页面以更新绑定状态
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} catch {
			toast.error("绑定失败，请稍后重试");
		} finally {
			setLoading({ ...loading, email: false });
		}
	};

	/**
	 * 处理邮箱解绑
	 */
	const handleEmailUnbind = () => {
		setUnbindConfirm({ open: true, type: "email" });
	};

	/**
	 * 处理爱发电绑定
	 */
	const handleAfdianBind = () => {
		// 跳转到爱发电 OAuth 入口，携带 method=bind
		router.push("/oauth/afdian?method=bind");
	};

	/**
	 * 处理爱发电解绑
	 */
	const handleAfdianUnbind = () => {
		setUnbindConfirm({ open: true, type: "afdian" });
	};

	return (
		<div className="space-y-6">
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center">
						<Link2 className="text-primary h-5 w-5" />
						账号绑定
					</CardTitle>
					<CardDescription>
						管理您的第三方登录方式和关联账号，绑定后可使用多种方式登录。
					</CardDescription>
				</CardHeader>
				<CardContent className="gap-6 grid">
					{/* 邮箱账号 */}
					<div className="p-4 border rounded-lg flex items-center justify-between space-x-4">
						<div className="flex items-center space-x-4">
							<div className="text-blue-600 rounded-full bg-blue-100 flex h-10 w-10 items-center justify-center dark:text-blue-400 dark:bg-blue-900/30">
								<Mail className="h-5 w-5" />
							</div>
							<div className="space-y-1">
								<p className="text-sm leading-none font-medium flex gap-2 items-center">
									邮箱账号
									{bindings.loginMethod === "email" && (
										<Badge variant="secondary" className="text-xs font-normal">当前登录</Badge>
									)}
								</p>
								<p className="text-muted-foreground text-sm">
									{bindings.email.bound ? bindings.email.value : "未绑定邮箱账号"}
								</p>
							</div>
						</div>
						{bindings.email.bound
							? (
									<Button variant="outline" size="sm" onClick={handleEmailUnbind} disabled={loading.email}>
										解绑
									</Button>
								)
							: (
									<Button size="sm" onClick={() => setShowEmailDialog(true)} disabled={loading.email}>
										绑定
									</Button>
								)}
					</div>

					{/* QQ 账号 */}
					<div className="p-4 border rounded-lg flex items-center justify-between space-x-4">
						<div className="flex items-center space-x-4">
							<div className="text-[#12B7F5] rounded-full bg-[#12B7F5]/10 flex h-10 w-10 items-center justify-center">
								<Icon icon="mingcute:qq-fill" className="h-5 w-5" />
							</div>
							<div className="space-y-1">
								<p className="text-sm leading-none font-medium flex gap-2 items-center">
									QQ 账号
									{bindings.loginMethod === "qq" && (
										<Badge variant="secondary" className="text-xs font-normal">当前登录</Badge>
									)}
								</p>
								<p className="text-muted-foreground text-sm">
									{bindings.qq.bound ? (bindings.qq.value || "已绑定") : "未绑定 QQ 账号"}
								</p>
							</div>
						</div>
						{bindings.qq.bound
							? (
									<Button variant="outline" size="sm" onClick={handleQQUnbind} disabled={loading.qq}>
										解绑
									</Button>
								)
							: (
									<Button
										size="sm"
										variant="outline"
										className="hover:text-[#12B7F5] hover:border-[#12B7F5] hover:bg-[#12B7F5]/10"
										onClick={handleQQBind}
										disabled={loading.qq}
									>
										绑定
									</Button>
								)}
					</div>

					{/* 爱发电账号 */}
					<div className="p-4 border rounded-lg flex items-center justify-between space-x-4">
						<div className="flex items-center space-x-4">
							<div className="text-[#946ce6] rounded-full bg-[#946ce6]/10 flex h-10 w-10 items-center justify-center">
								<Icon icon="simple-icons:afdian" className="h-5 w-5" />
							</div>
							<div className="space-y-1">
								<p className="text-sm leading-none font-medium flex gap-2 items-center">
									爱发电
									{bindings.loginMethod === "afd" && (
										<Badge variant="secondary" className="text-xs font-normal">当前登录</Badge>
									)}
								</p>
								<p className="text-muted-foreground text-sm">
									{bindings.afdian.bound ? (bindings.afdian.value || "已绑定") : "未绑定爱发电账号"}
								</p>
							</div>
						</div>
						{bindings.afdian.bound
							? (
									<Button variant="outline" size="sm" onClick={handleAfdianUnbind} disabled={loading.afdian}>
										解绑
									</Button>
								)
							: (
									<Button
										size="sm"
										variant="outline"
										className="hover:text-[#946ce6] hover:border-[#946ce6] hover:bg-[#946ce6]/10"
										onClick={handleAfdianBind}
										disabled={loading.afdian}
									>
										绑定
									</Button>
								)}
					</div>
				</CardContent>
			</Card>

			{/* 邮箱绑定对话框 */}
			<Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>绑定邮箱</DialogTitle>
						<DialogDescription>
							请输入您的邮箱地址和密码（可选）
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">邮箱地址</Label>
							<Input
								id="email"
								type="email"
								placeholder="your@email.com"
								value={emailForm.email}
								onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">密码（可选）</Label>
							<Input
								id="password"
								type="password"
								placeholder="设置密码以使用邮箱登录"
								value={emailForm.password}
								onChange={e => setEmailForm({ ...emailForm, password: e.target.value })}
							/>
							<p className="text-xs text-slate-500">
								如果不设置密码，您将只能通过第三方方式登录
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowEmailDialog(false)}>
							取消
						</Button>
						<Button onClick={handleEmailBind} disabled={loading.email}>
							{loading.email ? "绑定中..." : "确认绑定"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 解绑确认对话框 */}
			<Dialog open={unbindConfirm.open} onOpenChange={open => !open && setUnbindConfirm(prev => ({ ...prev, open: false }))}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>确认解绑</DialogTitle>
						<DialogDescription>
							{unbindConfirm.type === "email" && "确定要解绑您的邮箱账号吗？解绑后将无法使用邮箱登录。"}
							{unbindConfirm.type === "qq" && "确定要解绑您的 QQ 账号吗？解绑后将无法使用 QQ 快捷登录。"}
							{unbindConfirm.type === "afdian" && "确定要解绑您的爱发电账号吗？解绑后将失去赞助者权益。"}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setUnbindConfirm(prev => ({ ...prev, open: false }))}>
							取消
						</Button>
						<Button
							variant="destructive"
							onClick={executeUnbind}
							disabled={unbindConfirm.type ? loading[unbindConfirm.type] : false}
						>
							{unbindConfirm.type && loading[unbindConfirm.type] ? "解绑中..." : "确认解绑"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default AccountBindings;

"use client";

import { Icon } from "@iconify/react";
import { Mail, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { initiateQQLogin } from "@/utils/qq-oauth";

interface AccountBindingProps {
	userInfo: {
		email?: string | null;
		qqOpenid?: string | null;
		nickname?: string | null;
		avatar?: string | null;
		loginMethod?: "email" | "qq";
	};
	onUpdate: () => void;
}

export const AccountBinding = ({ userInfo, onUpdate }: AccountBindingProps) => {
	const [_bindingQQ, _setBindingQQ] = useState(false);
	const [emailBindOpen, setEmailBindOpen] = useState(false);
	const [emailData, setEmailData] = useState({ email: "", password: "" });
	const [bindingEmail, setBindingEmail] = useState(false);

	const handleQQBind = async () => {
		if (userInfo.qqOpenid) {
			toast.error("已绑定QQ账号");
			return;
		}

		// 发起QQ OAuth绑定
		const callbackUrl = `${window.location.origin}/dashboard?action=bind_qq`;
		initiateQQLogin(callbackUrl, `qq_bind_${Date.now()}`);
	};

	const handleEmailBind = async () => {
		if (!emailData.email || !emailData.password) {
			toast.error("请填写邮箱和密码");
			return;
		}

		try {
			setBindingEmail(true);
			const res = await fetch("/api/auth/bind-email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(emailData),
			});

			const data = await res.json();

			if (data.success) {
				toast.success("邮箱绑定成功");
				setEmailBindOpen(false);
				setEmailData({ email: "", password: "" });
				onUpdate();
			} else {
				toast.error(data.message || "邮箱绑定失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("邮箱绑定失败，请稍后再试");
		} finally {
			setBindingEmail(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center">
					<Shield className="mr-2 h-5 w-5" />
					账号绑定
				</CardTitle>
				<CardDescription>绑定邮箱或QQ账号以增强账户安全性</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* QQ绑定状态 */}
				<div className="p-3 border rounded-lg flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<Icon icon="mingcute:qq-fill" className="text-[#12B7F5] h-6 w-6" />
						<div>
							<div className="font-medium">QQ账号</div>
							<div className="text-muted-foreground text-sm">
								{userInfo.qqOpenid ? "已绑定" : "未绑定"}
							</div>
						</div>
					</div>
					{userInfo.qqOpenid
						? (
								<div className="flex items-center space-x-2">
									<div className="rounded-full bg-green-500 h-2 w-2"></div>
									<span className="text-sm text-green-600">已绑定</span>
								</div>
							)
						: (
								<Button
									onClick={handleQQBind}
									disabled={_bindingQQ}
									variant="outline"
									size="sm"
									className="text-[#12B7F5] border-[#12B7F5] hover:text-white hover:bg-[#12B7F5]"
								>
									{_bindingQQ ? "绑定中..." : "绑定QQ"}
								</Button>
							)}
				</div>

				<Separator />

				{/* 邮箱绑定状态 */}
				<div className="p-3 border rounded-lg flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<Mail className="text-blue-600 h-6 w-6" />
						<div>
							<div className="font-medium">邮箱账号</div>
							<div className="text-muted-foreground text-sm">
								{userInfo.email ? userInfo.email : "未绑定"}
							</div>
						</div>
					</div>
					{userInfo.email
						? (
								<div className="flex items-center space-x-2">
									<div className="rounded-full bg-green-500 h-2 w-2"></div>
									<span className="text-sm text-green-600">已绑定</span>
								</div>
							)
						: (
								<Button
									onClick={() => setEmailBindOpen(true)}
									variant="outline"
									size="sm"
									className="text-blue-600 border-blue-600 hover:text-white hover:bg-blue-600"
								>
									绑定邮箱
								</Button>
							)}
				</div>

				{/* 绑定提示 */}
				{(!userInfo.email || !userInfo.qqOpenid) && (
					<div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
						<p className="text-sm text-blue-700">
							建议绑定邮箱和QQ账号，这样即使其中一种登录方式出现问题，您仍可以通过另一种方式访问账户。
						</p>
					</div>
				)}
			</CardContent>

			{/* 邮箱绑定弹窗 */}
			<Dialog open={emailBindOpen} onOpenChange={setEmailBindOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>绑定邮箱账号</DialogTitle>
						<DialogDescription>
							为您的QQ账号绑定邮箱，设置密码后可使用邮箱登录
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">邮箱地址</label>
							<Input
								type="email"
								placeholder="请输入邮箱地址"
								value={emailData.email}
								onChange={e => setEmailData(prev => ({ ...prev, email: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">设置密码</label>
							<Input
								type="password"
								placeholder="请设置登录密码"
								value={emailData.password}
								onChange={e => setEmailData(prev => ({ ...prev, password: e.target.value }))}
							/>
						</div>
						<div className="pt-4 flex space-x-2">
							<Button
								variant="outline"
								onClick={() => setEmailBindOpen(false)}
								className="flex-1"
							>
								取消
							</Button>
							<Button
								onClick={handleEmailBind}
								disabled={bindingEmail}
								className="flex-1"
							>
								{bindingEmail ? "绑定中..." : "确认绑定"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
};

"use client";

import { Icon } from "@iconify/react";
import { AlertCircle, ArrowRight, Lock, LogIn, Mail, Ticket } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSetState } from "@/utils/auth/client";

/**
 * 登录表单组件
 * @returns 登录交互卡片
 */
const SignInForm = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [inviteCode, setInviteCode] = useState("");
	const [inviteCodeRequired, setInviteCodeRequired] = useState(false);

	// 从 URL 参数初始化错误信息
	const initialErrorMessage = searchParams.get("status") && searchParams.get("msg") ? searchParams.get("msg") : null;
	const [errorMessage] = useState<string | null>(initialErrorMessage);

	// 检查是否需要邀请码
	useEffect(() => {
		const checkInviteConfig = async () => {
			try {
				const res = await fetch("/api/auth/invite-config");
				const data = await res.json();
				setInviteCodeRequired(data.required);
			} catch (error) {
				console.error("获取邀请码配置失败:", error);
			}
		};
		checkInviteConfig();

		// 如果有错误信息，显示 toast
		if (initialErrorMessage) {
			toast.error(initialErrorMessage);
		}
	}, [initialErrorMessage]);

	const handleQQLoginClick = () => {
		// 跳转到统一 QQ OAuth 入口，携带 method=signin 和邀请码
		const url = new URL("/oauth/qq", window.location.origin);
		url.searchParams.set("method", "signin");
		if (inviteCodeRequired && inviteCode) {
			url.searchParams.set("inviteCode", inviteCode);
		}
		router.push(url.toString());
	};

	const handleAfdianLoginClick = () => {
		// 跳转到爱发电 OAuth 入口，携带 method=signin 和邀请码
		const url = new URL("/oauth/afdian", window.location.origin);
		url.searchParams.set("method", "signin");
		if (inviteCodeRequired && inviteCode) {
			url.searchParams.set("inviteCode", inviteCode);
		}
		router.push(url.toString());
	};

	const handleSubmit = async () => {
		if (!email || !password) {
			toast.error("请填写邮箱和密码");
			return;
		}
		try {
			setLoading(true);
			const res = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();
			if (data.success) {
				toast.success("登录成功");
				// 同步登录状态到状态管理
				await loginSetState();
				router.push("/dashboard");
			} else {
				toast.error(data.message || "登录失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("登录失败，请稍后再试");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">
			<Card className="border-0 bg-white/80 max-w-md w-full shadow-2xl backdrop-blur-sm dark:bg-slate-900/60">
				<CardHeader className="text-center space-y-1">
					<CardTitle className="text-2xl tracking-tight font-bold flex gap-2 items-center justify-center">
						<LogIn className="text-primary h-6 w-6" />
						登录
					</CardTitle>
					<CardDescription>
						输入邮箱和密码以登录
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* 错误信息提示 */}
					{errorMessage && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					)}

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">邮箱</Label>
							<div className="relative">
								<Mail className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
								<Input
									id="email"
									className="pl-9"
									value={email}
									onChange={e => setEmail(e.target.value)}
									placeholder="请输入邮箱地址"
									type="email"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">密码</Label>
								<a href="/forgot-password" className="text-primary text-xs font-medium hover:underline">忘记密码？</a>
							</div>
							<div className="relative">
								<Lock className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
								<Input
									id="password"
									className="pl-9"
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder="••••••••"
									type="password"
								/>
							</div>
						</div>
						<Button disabled={loading} onClick={handleSubmit} className="w-full" size="lg">
							{loading
								? "正在登录..."
								: (
										<span className="flex gap-2 items-center justify-center">
											登录
											<ArrowRight className="h-4 w-4" />
										</span>
									)}
						</Button>
					</div>

					<div className="relative">
						<div className="flex items-center inset-0 absolute">
							<span className="border-t w-full" />
						</div>
						<div className="text-xs flex uppercase justify-center relative">
							<span className="bg-background text-muted-foreground px-2">
								或者通过以下方式
							</span>
						</div>
					</div>

					{/* 第三方登录需要邀请码时显示输入框 */}
					{inviteCodeRequired && (
						<div className="space-y-2">
							<Label htmlFor="inviteCode">
								<span className="flex gap-1 items-center">
									<Ticket className="h-4 w-4" />
									邀请码（第三方登录新用户必填）
								</span>
							</Label>
							<Input
								id="inviteCode"
								value={inviteCode}
								onChange={e => setInviteCode(e.target.value.toUpperCase())}
								placeholder="如果您是新用户，请输入邀请码"
							/>
							<p className="text-muted-foreground text-xs">
								已有账号可直接登录，无需邀请码
							</p>
						</div>
					)}

					<div className="gap-4 grid grid-cols-2">
						<Button
							disabled={loading}
							onClick={handleQQLoginClick}
							variant="outline"
							className="w-full hover:text-[#12B7F5] hover:border-[#12B7F5] hover:bg-[#12B7F5]/10"
						>
							<span className="flex gap-2 items-center justify-center">
								<Icon icon="mingcute:qq-fill" className="text-[#12B7F5] h-4 w-4" />
								QQ
							</span>
						</Button>
						<Button
							disabled={loading}
							onClick={handleAfdianLoginClick}
							variant="outline"
							className="w-full hover:text-[#946ce6] hover:border-[#946ce6] hover:bg-[#946ce6]/10"
						>
							<span className="flex gap-2 items-center justify-center">
								<Icon icon="simple-icons:afdian" className="text-[#946ce6] h-4 w-4" />
								爱发电
							</span>
						</Button>
					</div>

					<div className="text-muted-foreground text-sm text-center">
						还没有账号？
						{" "}
						<a className="text-primary font-medium hover:underline" href="/signup">立即注册</a>
						{" "}
						· 想支持我们？
						<a className="text-pink-600 font-medium hover:underline" href="/sponsors">去赞助</a>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default SignInForm;

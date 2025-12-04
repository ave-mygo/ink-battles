"use client";

import { Icon } from "@iconify/react";
import { AlertCircle, ArrowRight, Lock, Mail, ShieldCheck, Ticket, Timer, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
import { PasswordStrengthIndicator } from "@/components/common/password-strength";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPasswordValid } from "@/lib/password-strength";
import { loginSetState } from "@/utils/auth/client";

/**
 * 注册表单组件（含邮箱验证码和可选邀请码）
 * @returns 注册交互卡片
 */
const SignUpForm = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [code, setCode] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [inviteCodeRequired, setInviteCodeRequired] = useState(false);
	const [sending, setSending] = useState(false);
	const [countdown, setCountdown] = useState(0);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	// 从 URL 参数初始化错误信息
	const initialErrorMessage = searchParams.get("status") && searchParams.get("msg") ? searchParams.get("msg") : null;
	const [errorMessage] = useState<string | null>(initialErrorMessage);

	const canSend = useMemo(() => countdown <= 0 && !!email, [countdown, email]);

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
		// 跳转到统一 QQ OAuth 入口，携带 method=signup 和邀请码
		const url = new URL("/oauth/qq", window.location.origin);
		url.searchParams.set("method", "signup");
		if (inviteCode) {
			url.searchParams.set("inviteCode", inviteCode);
		}
		router.push(url.toString());
	};

	const handleAfdianLoginClick = () => {
		// 跳转到爱发电 OAuth 入口，携带 method=signup 和邀请码
		const url = new URL("/oauth/afdian", window.location.origin);
		url.searchParams.set("method", "signup");
		if (inviteCode) {
			url.searchParams.set("inviteCode", inviteCode);
		}
		router.push(url.toString());
	};

	useEffect(() => {
		if (countdown > 0) {
			timerRef.current = setTimeout(() => setCountdown(prev => prev - 1), 1000);
			return () => {
				if (timerRef.current)
					clearTimeout(timerRef.current);
			};
		}
	}, [countdown]);

	const sendCode = async () => {
		if (!email) {
			toast.error("请先填写邮箱");
			return;
		}
		try {
			setSending(true);
			const res = await fetch("/api/auth/send-code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, type: "register" }),
			});
			const data = await res.json();
			if (data.success) {
				toast.success("验证码已发送，请查收邮箱");
				setCountdown(60);
			} else {
				toast.error(data.message || "发送失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("发送失败，请稍后再试");
		} finally {
			setSending(false);
		}
	};

	const handleSubmit = async () => {
		if (!email || !password || !confirmPassword || !code) {
			toast.error("请完整填写信息");
			return;
		}
		if (inviteCodeRequired && !inviteCode) {
			toast.error("请填写邀请码");
			return;
		}
		if (!isPasswordValid(password)) {
			toast.error("密码不符合要求，请检查密码强度");
			return;
		}
		if (password !== confirmPassword) {
			toast.error("两次输入的密码不一致");
			return;
		}
		try {
			const res = await fetch("/api/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, code, inviteCode: inviteCode || undefined }),
			});
			const data = await res.json();
			if (data.success) {
				toast.success("注册成功，尝试自动登录");
				// 注册成功后，尝试自动登录
				try {
					const loginRes = await fetch("/api/login", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email, password }),
					});
					const loginData = await loginRes.json();
					if (loginData.success) {
						// 同步登录状态到状态管理
						await loginSetState();
						toast.success("自动登录成功");
						router.push("/dashboard");
					} else {
						// 自动登录失败，跳转到登录页
						router.push("/signin");
					}
				} catch (loginError) {
					console.error("自动登录失败:", loginError);
					router.push("/signin");
				}
			} else {
				toast.error(data.message || "注册失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("注册失败，请稍后再试");
		}
	};

	return (
		<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">
			<Card className="border-0 bg-white/80 max-w-md w-full shadow-2xl backdrop-blur-sm dark:bg-slate-900/60">
				<CardHeader className="text-center space-y-1">
					<CardTitle className="text-2xl tracking-tight font-bold flex gap-2 items-center justify-center">
						<UserPlus className="text-primary h-6 w-6" />
						注册
					</CardTitle>
					<CardDescription>
						使用邮箱注册并完成验证码验证
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
							<Label htmlFor="code">验证码</Label>
							<div className="flex gap-2">
								<div className="flex-1 relative">
									<ShieldCheck className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
									<Input
										id="code"
										className="pl-9"
										value={code}
										onChange={e => setCode(e.target.value)}
										placeholder="6位数字"
									/>
								</div>
								<Button onClick={sendCode} disabled={!canSend || sending} variant="outline" className="shrink-0 w-32">
									{countdown > 0
										? (
												<span className="text-primary flex gap-1 items-center">
													<Timer className="h-4 w-4" />
													{" "}
													{countdown}
													s
												</span>
											)
										: (
												"发送验证码"
											)}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">设置密码</Label>
							<div className="relative">
								<Lock className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
								<Input
									id="password"
									className="pl-9"
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder="请输入密码"
									type="password"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">确认密码</Label>
							<div className="relative">
								<Lock className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
								<Input
									id="confirmPassword"
									className="pl-9"
									value={confirmPassword}
									onChange={e => setConfirmPassword(e.target.value)}
									placeholder="再次输入密码"
									type="password"
								/>
							</div>
						</div>

						{/* 邀请码输入框 */}
						{inviteCodeRequired && (
							<div className="space-y-2">
								<Label htmlFor="inviteCode">
									邀请码
									<span className="text-destructive ml-1">*</span>
								</Label>
								<div className="relative">
									<Ticket className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
									<Input
										id="inviteCode"
										className="pl-9"
										value={inviteCode}
										onChange={e => setInviteCode(e.target.value.toUpperCase())}
										placeholder="请输入邀请码"
									/>
								</div>
								<p className="text-muted-foreground text-xs">
									当前注册需要邀请码，请联系管理员获取
								</p>
							</div>
						)}

						{/* 密码强度详细指示器 */}
						{password && (
							<PasswordStrengthIndicator
								password={password}
								className="border-border/40 bg-muted/20 p-3 border rounded-lg"
							/>
						)}

						<Button onClick={handleSubmit} className="w-full" size="lg">
							<span className="flex gap-2 items-center justify-center">
								完成注册
								<ArrowRight className="h-4 w-4" />
							</span>
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

					{/* 第三方登录区域 - 带锁定效果 */}
					<div className="relative">
						<div className="gap-4 grid grid-cols-2">
							<Button
								disabled={inviteCodeRequired && !inviteCode}
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
								disabled={inviteCodeRequired && !inviteCode}
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

						{/* 需要邀请码但未输入时的锁定遮罩 */}
						{inviteCodeRequired && !inviteCode && (
							<div className="bg-background/80 rounded-lg flex flex-col gap-1 items-center inset-0 justify-center absolute backdrop-blur-[2px]">
								<Lock className="text-muted-foreground h-5 w-5" />
								<span className="text-muted-foreground text-xs">请先填写邀请码</span>
							</div>
						)}
					</div>

					<div className="text-muted-foreground text-sm text-center">
						已有账号？
						{" "}
						<a className="text-primary font-medium hover:underline" href="/signin">去登录</a>
						{" "}
						· 想支持我们？
						<a className="text-pink-600 font-medium hover:underline" href="/sponsors">去赞助</a>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default SignUpForm;

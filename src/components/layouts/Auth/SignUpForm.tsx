"use client";

import { ArrowRight, Lock, Mail, ShieldCheck, Timer, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordStrengthIndicator, PasswordStrengthMeter } from "@/components/ui/password-strength";
import { isPasswordValid, calculatePasswordStrength } from "@/lib/password-strength";

/**
 * 注册表单组件（含邮箱验证码）
 * @returns 注册交互卡片
 */
const SignUpForm = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [code, setCode] = useState("");
	const [sending, setSending] = useState(false);
	const [countdown, setCountdown] = useState(0);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	const canSend = useMemo(() => countdown <= 0 && !!email, [countdown, email]);

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
				body: JSON.stringify({ email, password, code }),
			});
			const data = await res.json();
			if (data.success) {
				toast.success("注册成功，请登录");
				window.location.href = "/signin";
			} else {
				toast.error(data.message || "注册失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("注册失败，请稍后再试");
		}
	};

	return (
		<div className="bg-gradient-to-br min-h-[calc(100vh-0px)] from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-16 container max-w-md">
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
					<CardHeader>
						<CardTitle className="text-xl flex gap-2 items-center">
							<UserPlus className="text-blue-600 h-5 w-5" />
							{" "}
							注册
						</CardTitle>
						<CardDescription>使用邮箱注册并完成验证码验证</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="text-muted-foreground text-sm flex gap-2 items-center">
								<Mail className="text-blue-600 h-4 w-4" />
								{" "}
								邮箱
							</div>
							<Input value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入邮箱" type="email" />
						</div>

						<div className="gap-2 grid grid-cols-[1fr_auto] items-end">
							<div className="space-y-2">
								<div className="text-muted-foreground text-sm flex gap-2 items-center">
									<ShieldCheck className="text-blue-600 h-4 w-4" />
									{" "}
									验证码
								</div>
								<Input value={code} onChange={e => setCode(e.target.value)} placeholder="六位数字" />
							</div>
							<Button onClick={sendCode} disabled={!canSend || sending} variant="outline" className="min-w-28">
								{countdown > 0
									? (
											<span className="text-blue-600 flex gap-1 items-center">
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

						<div className="space-y-2">
							<div className="text-muted-foreground text-sm flex gap-2 items-center">
								<Lock className="text-blue-600 h-4 w-4" />
								{" "}
								设置密码
							</div>
							<Input value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" type="password" />
							<PasswordStrengthMeter password={password} />
						</div>
						<div className="space-y-2">
							<div className="text-muted-foreground text-sm">确认密码</div>
							<Input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="再次输入密码" type="password" />
						</div>
						
						{/* 密码强度详细指示器 */}
						{password && (
							<div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
								<PasswordStrengthIndicator password={password} />
							</div>
						)}
						
						<Button onClick={handleSubmit} className="w-full">
							<span className="flex gap-2 items-center justify-center">
								完成注册
								<ArrowRight className="h-4 w-4" />
							</span>
						</Button>
						<div className="text-muted-foreground text-sm text-center">
							已有账号？
							{" "}
							<a className="text-blue-600 hover:underline" href="/signin">去登录</a>
							{" "}
							· 想支持我们？
							<a className="text-pink-600 hover:underline" href="/sponsors">去赞助</a>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default SignUpForm;

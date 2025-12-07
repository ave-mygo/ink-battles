"use client";

import { ArrowRight, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, sendResetPasswordCode, verifyResetPasswordCode } from "@/utils/auth/forgot-password";

/**
 * 忘记密码表单组件
 */
const ForgotPasswordForm = () => {
	const router = useRouter();
	const [step, setStep] = useState<"email" | "code" | "reset">("email");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [countdown, setCountdown] = useState(0);

	/**
	 * 发送重置密码邮件
	 */
	const handleSendCode = async () => {
		if (!email) {
			toast.error("请输入邮箱地址");
			return;
		}

		setLoading(true);
		try {
			const result = await sendResetPasswordCode(email);

			if (result.success) {
				toast.success("验证码已发送，请查收邮箱");
				setStep("code");
				setCountdown(60);
				const timer = setInterval(() => {
					setCountdown((prev) => {
						if (prev <= 1) {
							clearInterval(timer);
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			} else {
				toast.error(result.message || "发送失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("发送失败，请稍后再试");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * 验证验证码
	 */
	const handleVerifyCode = async () => {
		if (!code) {
			toast.error("请输入验证码");
			return;
		}

		setLoading(true);
		try {
			const result = await verifyResetPasswordCode(email, code);

			if (result.success) {
				toast.success("验证码正确");
				setStep("reset");
			} else {
				toast.error(result.message || "验证失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("验证失败，请稍后再试");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * 重置密码
	 */
	const handleResetPassword = async () => {
		if (!password || !confirmPassword) {
			toast.error("请填写新密码");
			return;
		}

		if (password !== confirmPassword) {
			toast.error("两次输入的密码不一致");
			return;
		}

		if (password.length < 8) {
			toast.error("密码至少 8 位字符");
			return;
		}

		setLoading(true);
		try {
			const result = await resetPassword(email, code, password);

			if (result.success) {
				toast.success("密码重置成功，请重新登录");
				setTimeout(() => {
					router.push("/signin");
				}, 1000);
			} else {
				toast.error(result.message || "重置失败");
			}
		} catch (error) {
			console.error(error);
			toast.error("重置失败，请稍后再试");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-4 flex min-h-[calc(100vh-4rem)] items-center justify-center">
			<Card className="border-0 bg-white/80 max-w-md w-full shadow-2xl backdrop-blur-sm dark:bg-slate-900/60">
				<CardHeader className="text-center space-y-1">
					<CardTitle className="text-2xl tracking-tight font-bold flex gap-2 items-center justify-center">
						<Lock className="text-primary h-6 w-6" />
						重置密码
					</CardTitle>
					<CardDescription>
						{step === "email" && "输入您的邮箱地址"}
						{step === "code" && "请输入发送到邮箱的验证码"}
						{step === "reset" && "设置新密码"}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{step === "email" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">邮箱地址</Label>
								<div className="relative">
									<Mail className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
									<Input
										id="email"
										className="pl-9"
										value={email}
										onChange={e => setEmail(e.target.value)}
										placeholder="请输入注册邮箱"
										type="email"
										onKeyDown={e => e.key === "Enter" && !loading && handleSendCode()}
									/>
								</div>
							</div>
							<Button
								disabled={loading || !email}
								onClick={handleSendCode}
								className="w-full"
								size="lg"
							>
								{loading
									? "发送中..."
									: (
											<span className="flex gap-2 items-center justify-center">
												发送验证码
												<ArrowRight className="h-4 w-4" />
											</span>
										)}
							</Button>
						</div>
					)}

					{step === "code" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="code">验证码</Label>
								<Input
									id="code"
									value={code}
									onChange={e => setCode(e.target.value)}
									placeholder="请输入验证码"
									onKeyDown={e => e.key === "Enter" && !loading && handleVerifyCode()}
								/>
							</div>
							<Button
								disabled={loading || !code}
								onClick={handleVerifyCode}
								className="w-full"
								size="lg"
							>
								{loading
									? "验证中..."
									: (
											<span className="flex gap-2 items-center justify-center">
												验证验证码
												<ArrowRight className="h-4 w-4" />
											</span>
										)}
							</Button>
							<Button
								variant="outline"
								disabled={loading || countdown > 0}
								onClick={handleSendCode}
								className="w-full"
							>
								{countdown > 0 ? `${countdown}秒后重试` : "重新发送"}
							</Button>
						</div>
					)}

					{step === "reset" && (
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="password">新密码</Label>
								<div className="relative">
									<Lock className="text-muted-foreground h-4 w-4 left-3 top-3 absolute" />
									<Input
										id="password"
										className="pl-9"
										value={password}
										onChange={e => setPassword(e.target.value)}
										placeholder="至少 8 位，包含 2 种类型"
										type="password"
									/>
								</div>
								<p className="text-xs text-slate-500">
									必须包含：大写、小写、数字、特殊字符中的任意 2 种
								</p>
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
										placeholder="请再次输入密码"
										type="password"
										onKeyDown={e => e.key === "Enter" && !loading && handleResetPassword()}
									/>
								</div>
							</div>
							<Button
								disabled={loading || !password || !confirmPassword}
								onClick={handleResetPassword}
								className="w-full"
								size="lg"
							>
								{loading
									? "重置中..."
									: (
											<span className="flex gap-2 items-center justify-center">
												重置密码
												<ArrowRight className="h-4 w-4" />
											</span>
										)}
							</Button>
						</div>
					)}

					<div className="text-muted-foreground text-sm text-center">
						返回
						{" "}
						<Link className="text-primary font-medium hover:underline" href="/signin">登录页面</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default ForgotPasswordForm;

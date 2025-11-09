"use client";

import { Icon } from "@iconify/react";
import { ArrowRight, Lock, LogIn, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginSetState } from "@/utils/auth/client";

/**
 * 登录表单组件
 * @returns 登录交互卡片
 */
const SignInForm = () => {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const handleQQLoginClick = () => {
		// 跳转到统一 QQ OAuth 入口，携带 method=signin
		window.location.href = "/oauth/qq?method=signin";
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
		<div className="min-h-[calc(100vh-0px)] from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto px-4 py-16 container max-w-md">
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-800/60">
					<CardHeader>
						<CardTitle className="text-xl flex gap-2 items-center">
							<LogIn className="text-blue-600 h-5 w-5" />
							{" "}
							登录
						</CardTitle>
						<CardDescription>输入邮箱和密码以进入系统</CardDescription>
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
						<div className="space-y-2">
							<div className="text-muted-foreground text-sm flex gap-2 items-center">
								<Lock className="text-blue-600 h-4 w-4" />
								{" "}
								密码
							</div>
							<Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" />
						</div>
						<Button disabled={loading} onClick={handleSubmit} className="w-full">
							{loading
								? "正在登录..."
								: (
										<span className="flex gap-2 items-center justify-center">
											进入
											<ArrowRight className="h-4 w-4" />
										</span>
									)}
						</Button>

						<div className="space-y-2">
							<div className="text-muted-foreground text-xs text-center">或</div>
							<Button
								disabled={loading}
								onClick={handleQQLoginClick}
								variant="outline"
								className="text-[#12B7F5] border-[#12B7F5] w-full hover:text-white hover:bg-[#12B7F5]"
							>
								<span className="flex gap-2 items-center justify-center">
									<Icon icon="mingcute:qq-fill" className="h-4 w-4" />
									QQ登录
								</span>
							</Button>
						</div>

						<div className="text-muted-foreground text-sm text-center">
							还没有账号？
							{" "}
							<a className="text-blue-600 hover:underline" href="/signup">去注册</a>
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

export default SignInForm;

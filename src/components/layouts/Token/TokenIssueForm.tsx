"use client";
import { AlertCircle, CheckCircle, Copy, ExternalLink, Fingerprint, Key, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateBrowserFingerprint } from "@/lib/browser-fingerprint";

interface UserInfo {
	userName: string;
	orderNumber: string;
	amount: number;
	createTime: number;
}

interface TokenResponse {
	success: boolean;
	token?: string;
	message?: string;
	error?: string;
	isUpdate?: boolean;
	userInfo?: UserInfo | null;
}

interface _FormState {
	identifier: string;
	isLoading: boolean;
	response: TokenResponse | null;
	copied: boolean;
	browserFingerprint: string;
	fingerprintLoading: boolean;
}

/**
 * Token签发表单组件
 * 用户输入订单号，系统验证后签发API Token
 */
export default function TokenIssueForm() {
	const [orderNumber, setOrderNumber] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [result, setResult] = useState<TokenResponse | null>(null);
	const [browserFingerprint, setBrowserFingerprint] = useState<string>("");
	const [fingerprintLoading, setFingerprintLoading] = useState<boolean>(false);

	// 初始化浏览器指纹
	useEffect(() => {
		const initFingerprint = async () => {
			setFingerprintLoading(true);
			try {
				const fingerprint = await generateBrowserFingerprint();
				setBrowserFingerprint(fingerprint);
			} catch (error) {
				console.error("生成浏览器指纹失败:", error);
				toast.error("初始化失败，请刷新页面重试");
			} finally {
				setFingerprintLoading(false);
			}
		};

		initFingerprint();
	}, []);

	/**
	 * 处理表单提交
	 */
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// 验证输入
		if (!orderNumber.trim()) {
			toast.error("请输入订单号或Token");
			return;
		}

		if (!browserFingerprint) {
			toast.error("浏览器指纹未生成，请刷新页面重试");
			return;
		}

		// 检查是否为token格式
		const isTokenFormat = /^[a-f0-9]{64}$/i.test(orderNumber.trim());

		if (!isTokenFormat) {
			// 验证订单号格式
			const orderPattern = /^[A-Z0-9]{10,30}$/i;
			if (!orderPattern.test(orderNumber.trim())) {
				toast.error("订单号格式不正确，请检查后重试");
				return;
			}
		}

		setIsLoading(true);
		setResult(null);

		try {
			const response = await fetch("/api/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					identifier: orderNumber.trim(),
					browserFingerprint,
				}),
			});

			const data: TokenResponse = await response.json();
			setResult(data);

			if (data.success) {
				const message = data.isUpdate ? "Token更新成功！" : "Token签发成功！";
				toast.success(data.message || message);
			} else {
				toast.error(data.error || "Token签发失败");
			}
		} catch (error) {
			console.error("Token签发失败:", error);
			setResult({
				success: false,
				error: "网络错误，请检查网络连接后重试",
			});
			toast.error("网络错误，请检查网络连接后重试");
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * 复制token到剪贴板
	 */
	const copyToken = async () => {
		if (result?.token) {
			try {
				await navigator.clipboard.writeText(result.token);
				toast.success("Token已复制到剪贴板");
			} catch (error) {
				console.error("复制失败:", error);
				toast.error("复制失败，请手动选择复制");
			}
		}
	};

	return (
		<div className="space-y-6">
			{/* 页面标题 */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader className="text-center">
					<CardTitle className="flex gap-2 items-center justify-center">
						<Key className="text-blue-600 h-6 w-6" />
						API Token 签发
					</CardTitle>
					<CardDescription className="text-base">
						通过爱发电订单号获取您的专属API Token，解锁无限制分析功能
					</CardDescription>
				</CardHeader>
			</Card>

			{/* 使用说明 */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center">
						<AlertCircle className="text-blue-600 h-5 w-5" />
						使用说明
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex gap-3 items-start">
						<div className="mt-2 rounded-full bg-blue-500 h-2 w-2"></div>
						<div>
							<p className="text-sm font-medium">第一步：完成赞助</p>
							<p className="text-xs text-gray-600">
								前往
								<a
									href="https://afdian.com/p/9c65d9cc617011ed81c352540025c377"
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-500 mx-1 underline hover:text-blue-700"
								>
									爱发电页面
									<ExternalLink className="ml-1 h-3 w-3 inline" />
								</a>
								完成赞助支付
							</p>
						</div>
					</div>
					<div className="flex gap-3 items-start">
						<div className="mt-2 rounded-full bg-blue-500 h-2 w-2"></div>
						<div>
							<p className="text-sm font-medium">第二步：获取订单号</p>
							<p className="text-xs text-gray-600">支付完成后，在爱发电的订单记录中找到订单号</p>
						</div>
					</div>
					<div className="flex gap-3 items-start">
						<div className="mt-2 rounded-full bg-blue-500 h-2 w-2"></div>
						<div>
							<p className="text-sm font-medium">第三步：签发Token</p>
							<p className="text-xs text-gray-600">在下方输入订单号，点击签发按钮获取您的专属Token</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 签发表单 */}
			<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
				<CardHeader>
					<CardTitle className="flex gap-2 items-center">
						<Key className="text-blue-600 h-5 w-5" />
						Token 签发
					</CardTitle>
					<CardDescription>请输入您的爱发电订单号或现有Token</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="orderNumber">订单号或Token</Label>
							<Input
								id="orderNumber"
								type="text"
								value={orderNumber}
								onChange={e => setOrderNumber(e.target.value)}
								placeholder="请输入爱发电订单号或现有Token"
								disabled={isLoading || fingerprintLoading}
								className="font-mono"
							/>
							{fingerprintLoading && (
								<div className="text-muted-foreground text-sm mt-2 flex gap-2 items-center">
									<Fingerprint className="h-4 w-4 animate-spin" />
									正在初始化浏览器指纹...
								</div>
							)}
							{browserFingerprint && !fingerprintLoading
								? (
										<div className="text-sm text-green-600 mt-2 flex gap-2 items-center">
											<CheckCircle className="h-4 w-4" />
											浏览器指纹已生成
										</div>
									)
								: (
										<div className="text-sm text-yellow-600 mt-2 flex gap-2 items-center">
											<AlertCircle className="h-4 w-4" />
											浏览器指纹生成失败，建议使用最新版本的 Edge 或 Chrome
										</div>
									)}
							<p className="text-xs text-gray-500">
								订单号通常是10-30位的字母数字组合
							</p>
						</div>

						<Button
							type="submit"
							disabled={isLoading || !orderNumber.trim()}
							className="bg-blue-600 w-full hover:bg-blue-700"
						>
							{isLoading ? "验证中..." : "签发 Token"}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* 结果显示 */}
			{result && (
				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
					<CardHeader>
						<CardTitle className="flex gap-2 items-center">
							{result.success
								? (
										<>
											<CheckCircle className="text-green-600 h-5 w-5" />
											签发成功
										</>
									)
								: (
										<>
											<XCircle className="text-red-600 h-5 w-5" />
											签发失败
										</>
									)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{result.success && result.token
							? (
									<div className="space-y-4">
										{/* 个性化感谢信息 */}
										{result.userInfo && (
											<div className="bg-gradient-to-r p-4 border border-purple-200 rounded-lg from-purple-50 to-pink-50">
												<div className="mb-3 flex gap-3 items-center">
													<div className="ml-3 flex-1">
														<h3 className="text-lg text-purple-800 font-semibold mb-1">
															尊敬的
															{" "}
															{result.userInfo.userName}
														</h3>
														<p className="text-sm text-purple-600">
															感谢您的捐赠！您的支持让我们能够继续为大家提供更好的服务。
														</p>
														<div className="text-xs text-purple-500 mt-2 flex gap-4">
															<span>
																订单号:
																{result.userInfo.orderNumber}
															</span>
															<span>
																金额: ¥
																{(result.userInfo.amount / 100).toFixed(2)}
															</span>
															<span>
																时间:
																{new Date(result.userInfo.createTime * 1000).toLocaleDateString()}
															</span>
														</div>
													</div>
												</div>
											</div>
										)}

										<div className="p-3 border border-green-200 rounded-lg bg-green-50">
											<div className="mb-2 flex gap-2 items-center">
												<div className="rounded-full bg-green-500 h-2 w-2"></div>
												<span className="text-sm text-green-700 font-medium">您的API Token</span>
											</div>
											<div className="flex gap-2 items-center">
												<code className="text-xs font-mono px-2 py-1 border rounded bg-white flex-1 break-all">
													{result.token}
												</code>
												<Button
													size="sm"
													variant="outline"
													onClick={copyToken}
													className="shrink-0"
												>
													<Copy className="h-4 w-4" />
												</Button>
											</div>
										</div>

										<div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
											<div className="mb-2 flex gap-2 items-center">
												<AlertCircle className="text-blue-600 h-4 w-4" />
												<span className="text-sm text-blue-700 font-medium">重要提醒</span>
											</div>
											<ul className="text-xs text-blue-600 space-y-1">
												<li>• 请妥善保管您的Token，不要泄露给他人</li>
												<li>• 在作品分析页面的Token输入框中使用此Token</li>
												<li>• Token长期有效，如有问题请联系客服</li>
											</ul>
										</div>
									</div>
								)
							: (
									<div className="p-3 border border-red-200 rounded-lg bg-red-50">
										<div className="flex gap-2 items-center">
											<div className="rounded-full bg-red-500 h-2 w-2"></div>
											<span className="text-sm text-red-700">
												{result.error || "未知错误"}
											</span>
										</div>
									</div>
								)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

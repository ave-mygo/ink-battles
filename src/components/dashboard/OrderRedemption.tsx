"use client";

import { ExternalLink, Gift, Loader2, Receipt, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { redeemOrderAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * 订单兑换组件
 * 允许用户输入爱发电订单号进行兑换
 */
export default function OrderRedemption() {
	const [orderNo, setOrderNo] = useState("");
	const [loading, setLoading] = useState(false);

	const handleRedeem = async () => {
		if (!orderNo.trim()) {
			toast.error("请输入订单号");
			return;
		}

		setLoading(true);

		try {
			const response = await redeemOrderAction(orderNo.trim());

			if (response.success) {
				toast.success("兑换成功！", {
					description: response.message,
				});
				setOrderNo(""); // 清空输入框
				// 刷新页面以更新计费信息
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			} else {
				toast.error("兑换失败", {
					description: response.message,
				});
			}
		} catch {
			toast.error("发生错误", {
				description: "请稍后重试",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="border-0 bg-white/80 shadow-lg transition-all relative overflow-hidden backdrop-blur-sm hover:shadow-xl">
			{/* 背景装饰 */}
			<div className="opacity-[0.03] pointer-events-none absolute -right-6 -top-6">
				<Gift className="h-48 w-48 rotate-12" />
			</div>

			<CardHeader>
				<CardTitle className="text-xl flex gap-2 items-center">
					<div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
						<Gift className="text-pink-600 h-5 w-5 dark:text-pink-400" />
					</div>
					订单兑换
				</CardTitle>
				<CardDescription>
					使用爱发电订单号兑换 API 调用次数或会员时长
				</CardDescription>
			</CardHeader>

			<CardContent className="relative z-10 space-y-6">
				<div className="space-y-3">
					<Label htmlFor="order-no" className="text-sm font-medium">
						爱发电订单号
					</Label>
					<div className="relative">
						<Receipt className="text-muted-foreground h-4 w-4 left-3 top-1/2 absolute -translate-y-1/2" />
						<Input
							id="order-no"
							placeholder="请输入订单号 (例如: 2024...)"
							value={orderNo}
							onChange={e => setOrderNo(e.target.value)}
							disabled={loading}
							className="pl-9 h-11"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleRedeem();
								}
							}}
						/>
					</div>
					<p className="text-muted-foreground text-xs ml-1">
						* 订单号通常以年份开头，可在爱发电“我的订单”中查看
					</p>
				</div>

				<div className="bg-muted/40 border-muted/50 p-4 border rounded-xl space-y-3">
					<div className="text-foreground/80 text-sm font-medium flex gap-2 items-center">
						<Sparkles className="text-amber-500 h-4 w-4" />
						<span>兑换说明</span>
					</div>
					<ul className="text-muted-foreground text-xs list-disc list-inside space-y-2">
						<li>请确保已在账户设置中绑定对应的爱发电账户</li>
						<li>每个订单号仅限兑换一次，兑换后立即生效</li>
						<li>支持兑换会员时长包和额度包</li>
					</ul>
				</div>
			</CardContent>

			<CardFooter className="bg-muted/10 p-6 border-t flex items-center justify-between">
				<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary px-2" asChild>
					<Link href="https://afdian.com/a/ink_battles" target="_blank" className="flex gap-1 items-center">
						前往爱发电支持
						{" "}
						<ExternalLink className="h-3 w-3" />
					</Link>
				</Button>
				<Button
					onClick={handleRedeem}
					disabled={loading || !orderNo.trim()}
					className="text-white min-w-[120px] shadow-md transition-all from-pink-500 to-rose-500 bg-linear-to-r hover:shadow-lg hover:from-pink-600 hover:to-rose-600"
				>
					{loading
						? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									处理中...
								</>
							)
						: (
								<>
									立即兑换
								</>
							)}
				</Button>
			</CardFooter>
		</Card>
	);
}

"use client";

import { Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrderRedemptionPanelProps {
	isAdmin: boolean;
	hasAfdianBinding: boolean;
	userTotalSpent?: number;
}

export const OrderRedemptionPanel = ({ isAdmin, hasAfdianBinding, userTotalSpent = 0 }: OrderRedemptionPanelProps) => {
	const [orderId, setOrderId] = useState("");
	const [loading, setLoading] = useState(false);

	// 计算会员等级和折扣价格用于显示
	const getMemberTier = (totalAmount: number) => {
		if (totalAmount >= 460)
			return { name: "钻石会员", discount: 20 };
		if (totalAmount >= 300)
			return { name: "金牌会员", discount: 15 };
		if (totalAmount >= 150)
			return { name: "银牌会员", discount: 10 };
		if (totalAmount >= 50)
			return { name: "铜牌会员", discount: 5 };
		return { name: "普通会员", discount: 0 };
	};

	const tierInfo = getMemberTier(userTotalSpent);
	const discountedPrice = (0.50 * (1 - tierInfo.discount / 100)).toFixed(2);

	const calculationInfo = `您的会员等级: ${tierInfo.name} (累计消费: ${userTotalSpent}元)
折扣后单价: ${discountedPrice}元/次 (原价0.50元/次，享受${tierInfo.discount}%折扣)
兑换公式: 订单金额 ÷ ${discountedPrice}元/次 = 兑换次数`;

	const handleRedeem = async () => {
		if (!orderId.trim()) {
			toast.error("请输入订单号");
			return;
		}

		if (!hasAfdianBinding) {
			toast.error("请先绑定爱发电账号才能兑换订单");
			return;
		}

		try {
			setLoading(true);

			const response = await fetch("/api/user/redeem-order", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					orderId: orderId.trim(),
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "兑换失败");
			}

			toast.success(result.message || "订单兑换成功");
			if (result.data?.calculation) {
				toast.info(`计算详情: ${result.data.calculation}`);
			}
			setOrderId("");
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "兑换失败";
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="min-w-0 w-full">
			<CardHeader>
				<CardTitle className="flex items-center">
					<Ticket className="mr-2 h-5 w-5" />
					订单兑换
				</CardTitle>
				<CardDescription>
					输入订单号自动计算并兑换调用次数
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!hasAfdianBinding && (
					<div className="p-3 border border-orange-200 rounded-lg bg-orange-50 dark:border-orange-900/40 dark:bg-orange-900/15">
						<p className="text-sm text-orange-800 dark:text-orange-300">
							请先绑定爱发电账号才能兑换订单号
						</p>
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="order-id">订单号</Label>
					<Input
						id="order-id"
						placeholder="请输入爱发电订单号"
						value={orderId}
						onChange={e => setOrderId(e.target.value)}
						disabled={loading || !hasAfdianBinding}
						className={`focus-visible:outline-none focus-visible:ring-2 ${hasAfdianBinding
							? "focus-visible:ring-blue-200 dark:focus-visible:ring-blue-900/40"
							: "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"}  `}
					/>
				</div>
				<div className="p-3 border border-blue-200 rounded-lg bg-blue-50 dark:border-blue-900/40 dark:bg-blue-900/15">
					<p className="text-sm text-blue-700 whitespace-pre-line dark:text-blue-300">
						{calculationInfo}
					</p>
				</div>

				<div className="pt-2">
					<Button
						onClick={handleRedeem}
						disabled={loading || !orderId.trim() || !hasAfdianBinding}
						className={`w-full focus-visible:outline-none focus-visible:ring-2 ${hasAfdianBinding
							? "hover:bg-primary/90 focus-visible:ring-primary/30 dark:text-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 dark:focus-visible:ring-slate-600"
							: "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"}  `}
					>
						{loading ? "兑换中..." : "确认兑换"}
					</Button>

				</div>

				{isAdmin && (
					<div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
						<p className="text-muted-foreground text-sm">
							管理员模式：可查看和管理订单兑换记录
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

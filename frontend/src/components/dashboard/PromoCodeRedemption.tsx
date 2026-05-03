"use client";

import { Loader2, Percent, TicketCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyPromoCode, notifyBillingBalanceUpdated } from "@/utils/billing/client";
import { useBillingContext } from "./BillingProvider";

/**
 * 促销码兑换组件
 * 促销码用于在订单兑换时降低付费单次价格。
 */
export default function PromoCodeRedemption() {
	const { refreshBilling } = useBillingContext();
	const [promoCode, setPromoCode] = useState("");
	const [loading, setLoading] = useState(false);

	const handleApplyPromoCode = async () => {
		const normalizedPromoCode = promoCode.trim();
		if (!normalizedPromoCode) {
			toast.error("请输入促销码");
			return;
		}

		setLoading(true);

		try {
			const response = await applyPromoCode(normalizedPromoCode);
			if (response.success) {
				toast.success("促销码已生效", {
					description: response.message,
				});
				setPromoCode("");
				notifyBillingBalanceUpdated();
				await refreshBilling();
			} else {
				toast.error("促销码使用失败", {
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
			<div className="opacity-[0.03] pointer-events-none absolute -right-6 -top-6">
				<TicketCheck className="h-44 w-44 rotate-12" />
			</div>

			<CardHeader>
				<CardTitle className="text-xl flex gap-2 items-center">
					<div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
						<Percent className="text-emerald-600 h-5 w-5 dark:text-emerald-400" />
					</div>
					促销码
				</CardTitle>
				<CardDescription>
					使用后会在订单兑换时按促销倍率计算付费次数
				</CardDescription>
			</CardHeader>

			<CardContent className="relative z-10 space-y-4">
				<div className="space-y-3">
					<Label htmlFor="promo-code" className="text-sm font-medium">
						促销码
					</Label>
					<div className="relative">
						<TicketCheck className="text-muted-foreground h-4 w-4 left-3 top-1/2 absolute -translate-y-1/2" />
						<Input
							id="promo-code"
							placeholder="请输入促销码"
							value={promoCode}
							onChange={event => setPromoCode(event.target.value)}
							disabled={loading}
							className="pl-9 h-11 uppercase"
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									void handleApplyPromoCode();
								}
							}}
						/>
					</div>
					<p className="text-muted-foreground text-xs ml-1">
						* 每个账户可用次数和生效期由后台配置决定
					</p>
				</div>
			</CardContent>

			<CardFooter className="bg-muted/10 p-6 border-t flex items-center justify-end">
				<Button
					onClick={() => {
						void handleApplyPromoCode();
					}}
					disabled={loading || !promoCode.trim()}
					className="text-white min-w-30 cursor-pointer shadow-md transition-all from-emerald-500 to-teal-500 bg-linear-to-r hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed"
				>
					{loading
						? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									处理中...
								</>
							)
						: "使用促销码"}
				</Button>
			</CardFooter>
		</Card>
	);
}

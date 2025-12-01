import { CreditCard } from "lucide-react";
import BillingManagement from "@/components/dashboard/BillingManagement";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import OrderRedemption from "@/components/dashboard/OrderRedemption";

/**
 * 计费管理页面
 * 展示用户计费信息和订单兑换功能
 */
export default function BillingPage() {
	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<DashboardPageHeader
				icon={CreditCard}
				title="计费管理"
				description="管理您的会员等级和调用次数"
			/>

			<div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
				<div className="space-y-6">
					<BillingManagement />
				</div>
				<div>
					<OrderRedemption />
				</div>
			</div>
		</div>
	);
}

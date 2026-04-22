import type { BillingSummaryResult } from "@ink-battles/shared/types/common/billing";
import { CreditCard } from "lucide-react";
import BillingManagement from "@/components/dashboard/BillingManagement";
import { BillingProvider } from "@/components/dashboard/BillingProvider";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import OrderRedemption from "@/components/dashboard/OrderRedemption";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

/**
 * 计费管理页面
 * 展示用户计费信息和订单兑换功能
 */
export default async function BillingPage() {
	const api = await createServerEden();
	const response = await api.api.v2.billing.summary.get();
	const billingSummary = await normalizeEdenResult<BillingSummaryResult>(response.data, response.error, "加载计费信息失败");

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<DashboardPageHeader
				icon={CreditCard}
				title="计费管理"
				description="管理您的会员等级和调用次数"
			/>

			<BillingProvider
				initialState={billingSummary.success ? billingSummary.data ?? null : null}
				initialErrorMessage={billingSummary.success ? null : billingSummary.message}
			>
				<div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
					<div className="space-y-6">
						<BillingManagement />
					</div>
					<div>
						<OrderRedemption />
					</div>
				</div>
			</BillingProvider>
		</div>
	);
}

import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { AccountBindings } from "@/components/dashboard/AccountBindings";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { getAccountBindingDetails } from "@/utils/dashboard/account-bindings";

export const metadata: Metadata = {
	title: "账号绑定与管理",
	description: "在此管理邮箱、QQ、爱发电等第三方登录方式",
};

export default async function AccountsPage() {
	const bindings = await getAccountBindingDetails();

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<DashboardPageHeader
				icon={Link2}
				title="账号绑定"
				description="管理您的第三方登录方式和关联账号"
			/>
			<AccountBindings bindings={bindings} />
		</div>
	);
}

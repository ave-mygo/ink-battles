import type { Metadata } from "next";
import type { AccountBindingsDetails } from "@ink-battles/shared/types/common/accounts";
import { Link2 } from "lucide-react";
import { AccountBindings } from "@/components/dashboard/AccountBindings";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

export const metadata: Metadata = {
	title: "账号绑定与管理",
	description: "在此管理邮箱、QQ、爱发电等第三方登录方式",
};

export default async function AccountsPage() {
	const api = await createServerEden();
	const response = await api.api.v2.accounts.details.get();
	const bindings = await unwrapEdenPayload<AccountBindingsDetails>(response.data, response.error, {
		email: { bound: false },
		qq: { bound: false },
		afdian: { bound: false },
		loginMethod: null,
	});

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

import type { Metadata } from "next";
import { AccountBindings } from "@/components/dashboard/AccountBindings";
import { getAccountBindingDetails } from "@/utils/dashboard/account-bindings";

export const metadata: Metadata = {
	title: "账号绑定与管理",
	description: "在此管理邮箱、QQ、爱发电等第三方登录方式",
};

export default async function AccountsPage() {
	const bindings = await getAccountBindingDetails();

	return (
		<div className="mx-auto max-w-3xl">
			<AccountBindings bindings={bindings} />
		</div>
	);
}

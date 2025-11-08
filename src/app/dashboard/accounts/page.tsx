import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountBindings } from "@/components/dashboard/AccountBindings";
import { bindQQAccount, getAccountBindingDetails } from "@/utils/dashboard/account-bindings";

export const metadata: Metadata = {
	title: "账号绑定与管理",
	description: "在此管理邮箱、QQ、爱发电等第三方登录方式",
};

interface AccountsPageProps {
	searchParams?: Record<string, string | string[] | undefined>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
	// 处理第三方回调（QQ）
	// 约定支持 ?bind=qq&openid=... 或 ?bind=qq&qq_openid=...
	const bind = (typeof searchParams?.bind === "string" ? searchParams?.bind : undefined) ?? undefined;
	const openidParam = searchParams?.openid ?? searchParams?.qq_openid;
	const openid = Array.isArray(openidParam) ? openidParam[0] : openidParam;

	if (bind === "qq" && openid) {
		const result = await bindQQAccount(openid);
		const status = result.success ? "qq_bind_success" : "qq_bind_error";
		const message = encodeURIComponent(result.message);
		redirect(`/dashboard/accounts?status=${status}&msg=${message}`);
	}

	const bindings = await getAccountBindingDetails();

	return (
		<div className="mx-auto max-w-3xl">
			<AccountBindings bindings={bindings} />
		</div>
	);
}

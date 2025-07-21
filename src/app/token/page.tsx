"use client";
import TokenIssueForm from "@/components/layouts/Token/TokenIssueForm";

/**
 * Token签发页面
 * 用户可以通过订单号获取API Token
 */
export default function TokenPage() {
	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-4xl">
				<TokenIssueForm />
			</div>
		</div>
	);
}

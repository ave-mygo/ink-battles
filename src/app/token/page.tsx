"use client";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import TokenIssueForm from "@/components/layouts/Token/TokenIssueForm";
import { Button } from "@/components/ui/button";

/**
 * Token签发页面
 * 用户可以通过订单号获取API Token
 */
export default function TokenPage() {
	const router = useRouter();
	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-4xl">
				<div className="mb-6 flex justify-center">
					<Button
						variant="outline"
						className="gap-2"
						onClick={() => router.push("/")}
					>
						<Home className="h-4 w-4" />
						返回首页
					</Button>
				</div>
				<TokenIssueForm />
			</div>
		</div>
	);
}

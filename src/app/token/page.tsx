"use client";
import { AlertTriangle, Home, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Token签发页面
 * 用户可以通过订单号获取API Token
 */
export default function TokenPage() {
	const router = useRouter();
	return (
		<div className="bg-gradient-to-br min-h-screen from-slate-50 to-slate-100">
			<div className="mx-auto px-4 py-8 container max-w-3xl">
				<div className="mb-6 flex gap-2 justify-center">
					<Button variant="outline" className="gap-2" onClick={() => router.push("/")}>
						<Home className="h-4 w-4" />
						{" "}
						返回首页
					</Button>
					<Button className="gap-2" onClick={() => router.push("/signin")}>
						<LogIn className="h-4 w-4" />
						{" "}
						去登录
					</Button>
				</div>

				<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
					<CardHeader className="text-center">
						<CardTitle className="text-red-600 flex gap-2 items-center justify-center">
							<AlertTriangle className="h-5 w-5" />
							{" "}
							Token 功能已下线
						</CardTitle>
						<CardDescription>系统已全面切换为账号登录与用量限制策略</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-slate-700 space-y-3">
						<p>当前规则：</p>
						<ul className="pl-5 list-disc space-y-1">
							<li>未登录：单次最多 5000 字，且每日累计 100000 字（按浏览器指纹或 IP 任一计算）。</li>
							<li>已登录：单次最多 60000 字，无每日累计上限。</li>
						</ul>
						<p>请前往登录以获得更流畅的体验。如需支持项目发展，可前往赞助页面。</p>
						<div className="pt-2 flex gap-2">
							<Button onClick={() => router.push("/signin")}>登录账号</Button>
							<Button variant="outline" onClick={() => router.push("/sponsors")}>前往赞助</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

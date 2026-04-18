import { FileQuestion, Home, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
	return (
		<div className="px-4 py-12 flex min-h-[calc(100vh-4rem)] w-full items-center justify-center">
			<Card className="border-0 bg-white/80 max-w-md w-full shadow-lg backdrop-blur-sm dark:bg-slate-950/50">
				<CardHeader className="text-center">
					<div className="mx-auto mb-6 rounded-full bg-slate-100 flex h-24 w-24 items-center justify-center dark:bg-slate-800">
						<FileQuestion className="text-slate-500 h-12 w-12 dark:text-slate-400" />
					</div>
					<CardTitle className="text-3xl tracking-tight font-bold">404</CardTitle>
					<p className="text-muted-foreground text-lg font-medium">页面未找到</p>
				</CardHeader>
				<CardContent className="text-muted-foreground text-center">
					<p>抱歉，您访问的页面不存在、已被移除或暂时不可用。</p>
					<p className="text-sm mt-2">请检查您输入的网址是否正确，或者返回首页重新开始。</p>
				</CardContent>
				<CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Button asChild variant="default" className="w-full sm:w-auto">
						<Link href="/">
							<Home className="mr-2 h-4 w-4" />
							返回首页
						</Link>
					</Button>
					<Button asChild variant="outline" className="w-full sm:w-auto">
						<Link href="/dashboard">
							<LayoutDashboard className="mr-2 h-4 w-4" />
							前往控制台
						</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}

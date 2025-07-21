import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function StatusHeader() {
	return (
		<div className="mb-8">
			<div className="mb-2 flex gap-4 items-center">
				<h1 className="text-4xl text-blue-900 tracking-tight font-extrabold flex gap-2 items-center drop-shadow-sm md:text-5xl">
					系统使用状态
				</h1>
				<Link
					href="/"
					className="text-sm text-white px-4 py-2 rounded-lg bg-blue-600 inline-flex gap-1 shadow transition-all duration-150 items-center hover:bg-blue-700"
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					{" "}
					返回首页
				</Link>
			</div>
			<p className="text-lg text-blue-700/80 font-medium flex gap-2 items-center">
				实时监控系统近14天的使用情况，包括请求数、响应时间、Token消耗等指标
				<span className="text-sm text-blue-400 ml-2 inline-flex gap-1 items-center">
					<RefreshCw className="animate-spin-slow h-4 w-4" />
					{" "}
					数据每分钟自动刷新
				</span>
			</p>
		</div>
	);
}

import Link from "next/link";

export default function StatusHeader() {
	return (
		<div className="mb-8">
			<div className="mb-2 flex gap-4 items-center">
				<h1 className="text-3xl text-gray-900 font-bold">系统使用状态</h1>
				<Link
					href="/"
					className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
				>
					返回首页
				</Link>
			</div>
			<p className="text-gray-500">
				实时监控系统近14天的使用情况，包括请求数、响应时间、Token消耗等指标
			</p>
		</div>
	);
}

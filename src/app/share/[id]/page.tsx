import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryDetailView } from "@/components/dashboard/history/HistoryDetailView";
import { Button } from "@/components/ui/button";

import { getPublicAnalysisRecord } from "@/utils/dashboard";

interface SharePageProps {
	params: Promise<{
		id: string;
	}>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
	const { id } = await params;
	const result = await getPublicAnalysisRecord(id);

	if (!result.success || !result.data) {
		return {
			title: "记录未公开",
			description: "该分析记录未公开分享",
		};
	}

	return {
		title: `分析记录分享`,
		description: `由 ${result.sharer ? result.sharer.displayName : "匿名用户"} 分享的作家战力分析记录`,
	};
}

export default async function SharePage({ params }: SharePageProps) {
	const { id } = await params;
	const result = await getPublicAnalysisRecord(id);

	if (!result.success || !result.data) {
		notFound();
	}

	const { sharer } = result;

	return (
		<div className="p-4 min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto py-8 max-w-6xl space-y-6">
				{/* 品牌标识 */}
				<div className="text-center space-y-2">
					<h1 className="text-3xl text-slate-900 font-bold dark:text-slate-100">
						Ink Battles
					</h1>
					<p className="text-slate-600 dark:text-slate-400">
						AI 驱动的作家战力分析系统
					</p>
				</div>

				{/* 分享者信息 */}
				{sharer && (
					<div className="flex gap-2 items-center justify-center">
						<Image
							src={sharer.avatarUrl}
							alt="分享者头像"
							width={28}
							height={28}
							className="border border-slate-200 rounded-full dark:border-slate-700"
						/>
						<p className="text-sm text-slate-600 dark:text-slate-400">
							<span className="text-slate-900 font-medium dark:text-slate-200">{sharer.displayName}</span>
							{sharer.bio
								? (
										<span className="text-slate-400 ml-1.5 dark:text-slate-500">
											「
											{sharer.bio}
											」
										</span>
									)
								: <span> 的分享</span>}
						</p>
					</div>
				)}

				{/* 分析记录详情 - 不显示原文内容 */}
				<HistoryDetailView record={result.data} showShareControls={false} showOriginalText={false} />

				{/* CTA 按钮 */}
				<div className="pt-6 flex justify-center">
					<Button size="lg" asChild>
						<Link href="/">
							在 Ink Battles 创建您自己的分析
						</Link>
					</Button>
				</div>

				{/* 页脚 */}
				<div className="text-sm text-slate-500 pt-8 text-center dark:text-slate-400">
					<p>
						Powered by
						{" "}
						<Link href="/" className="hover:text-blue-600 hover:underline">
							Ink Battles
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

"use client";
/* eslint unocss/order: off */
import { env } from "node:process";
import { Copy } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

interface SeoDebugCardProps {
	pathname: string;
	title: string;
	description: string;
}

/**
 * 开发调试用：快速查看当前页面的 Metadata 与 JSON-LD 生成结果
 * - 仅在开发环境渲染
 */
export const SeoDebugCard = ({ pathname, title, description }: SeoDebugCardProps) => {
	// 始终调用 Hook，避免条件调用；使用变量控制是否渲染
	const isDev = env.NODE_ENV === "development";
	const meta = createPageMetadata({ pathname, title, description });
	const [copied, setCopied] = useState(false);

	if (!isDev)
		return null;

	return (
		<Card className="mt-6 p-4 text-xs bg-white/80 border-0 shadow backdrop-blur space-y-3" aria-label="SEO 调试信息">
			<div className="flex items-center justify-between">
				<span className="font-semibold">SEO / GEO 调试</span>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => {
						navigator.clipboard.writeText(JSON.stringify(meta, null, 2));
						setCopied(true);
						setTimeout(() => setCopied(false), 1800);
					}}
				>
					<Copy className="mr-1 h-3 w-3" />
					{copied ? "已复制" : "复制 Metadata"}
				</Button>
			</div>
			<pre className="max-h-64 overflow-auto rounded bg-slate-900/90 p-3 text-[10px] leading-relaxed text-slate-50">
				{JSON.stringify(meta, null, 2)}
			</pre>
		</Card>
	);
};

export default SeoDebugCard;

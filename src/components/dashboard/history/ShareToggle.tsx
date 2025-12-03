"use client";

import { Globe, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ShareToggleProps {
	recordId: string;
	isPublic: boolean;
	onToggle?: (recordId: string, isPublic: boolean) => Promise<void>;
	className?: string;
}

/**
 * 公开分享切换组件
 */
export function ShareToggle({ recordId, isPublic: initialIsPublic, onToggle, className }: ShareToggleProps) {
	const [isPublic, setIsPublic] = useState(initialIsPublic);
	const [isLoading, setIsLoading] = useState(false);

	const handleToggle = async () => {
		if (!onToggle)
			return;

		setIsLoading(true);
		try {
			await onToggle(recordId, !isPublic);
			setIsPublic(!isPublic);
			toast.success(!isPublic ? "已设为公开" : "已设为私密", {
				description: !isPublic
					? "该记录现在可以通过分享链接访问"
					: "该记录现在仅您可见",
			});
		} catch (error) {
			toast.error("操作失败", {
				description: error instanceof Error ? error.message : "请稍后重试",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleToggle}
						disabled={isLoading}
						className={cn(
							"h-8 px-2 text-xs font-medium transition-colors cursor-pointer",
							isPublic
								? "text-green-600 hover:text-green-700 hover:bg-green-50"
								: "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
							className,
						)}
					>
						{isLoading
							? (
									<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
								)
							: (
									<>
										{isPublic ? <Globe className="mr-1.5 h-3.5 w-3.5" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}
									</>
								)}
						{isPublic ? "设为私密" : "设为公开"}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{isPublic ? "点击将此记录设为仅自己可见" : "点击生成公开链接分享给他人"}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

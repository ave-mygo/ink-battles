"use client";
/* eslint-disable unocss/order */

import type { UserSubscriptionData } from "@/types/billing/subscription";
import { Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AfdianBindingProps {
	data: UserSubscriptionData;
	bindLoading: boolean;
	onUnbindAfdian: () => void;
	onAfdianAuth: () => void;
}

export const AfdianBinding = ({
	data,
	bindLoading,
	onUnbindAfdian,
	onAfdianAuth,
}: AfdianBindingProps) => {
	return (
		<div className="space-y-3">
			<div className="flex items-center space-x-2">
				<Link2 className="text-muted-foreground h-4 w-4" />
				<span className="text-sm font-medium">爱发电账号</span>
			</div>

			{data.user.afdian_bound
				? (
						<div className="p-3 border border-green-200 rounded-lg bg-green-50 dark:border-green-900/40 dark:bg-green-900/15">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<div className="mb-1 flex items-center space-x-2">
										<div className="rounded-full bg-green-500 h-2 w-2"></div>
										<p className="text-sm text-green-800 font-medium dark:text-green-300">已绑定</p>
									</div>
									<div className="text-xs text-green-600 space-y-1 dark:text-green-300/80">
										{data.user.afdian_username && (
											<p>
												用户名: @
												{data.user.afdian_username}
											</p>
										)}
										{data.user.afdian_user_id && (
											<p>
												ID:
												{" "}
												{data.user.afdian_user_id}
											</p>
										)}
									</div>
								</div>
								<Button
									size="sm"
									variant="outline"
									onClick={onUnbindAfdian}
									disabled={bindLoading}
									className="ml-3 text-green-700 border-green-300 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-300 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-500/10 dark:focus-visible:ring-green-800"
								>
									<Unlink className="mr-1 h-3 w-3" />
									解绑
								</Button>
							</div>
						</div>
					)
				: (
						<div className="space-y-3">
							<div className="p-3 border border-orange-200 rounded-lg bg-orange-50 dark:border-orange-900/40 dark:bg-orange-900/15">
								<div className="flex items-center space-x-3">
									<div className="rounded-full bg-orange-500 h-2 w-2"></div>
									<div>
										<p className="text-sm text-orange-800 font-medium dark:text-orange-300">未绑定爱发电账号</p>
										<p className="text-xs text-orange-600 dark:text-orange-300/80">绑定后可享受订阅功能</p>
									</div>
								</div>
							</div>

							<Button
								size="sm"
								onClick={onAfdianAuth}
								className="w-full text-white bg-orange-500 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange-300 dark:bg-orange-600 dark:hover:bg-orange-500 dark:focus-visible:ring-orange-900"
							>
								<Link2 className="mr-1 h-3 w-3" />
								OAuth绑定
							</Button>
						</div>
					)}
		</div>
	);
};

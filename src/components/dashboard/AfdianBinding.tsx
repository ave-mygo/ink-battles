"use client";

import type { UserSubscriptionData } from "@/lib/subscription";
import { Link2, Unlink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AfdianBindingProps {
	data: UserSubscriptionData;
	bindLoading: boolean;
	orderIdDialogOpen: boolean;
	orderId: string;
	orderBindLoading: boolean;
	error: string | null;
	onUnbindAfdian: () => void;
	onAfdianAuth: () => void;
	onOrderIdDialogOpenChange: (open: boolean) => void;
	onOrderIdChange: (value: string) => void;
	onOrderIdBind: () => void;
	onErrorClear: () => void;
}

export const AfdianBinding = ({
	data,
	bindLoading,
	orderIdDialogOpen,
	orderId,
	orderBindLoading,
	error,
	onUnbindAfdian,
	onAfdianAuth,
	onOrderIdDialogOpenChange,
	onOrderIdChange,
	onOrderIdBind,
	onErrorClear,
}: AfdianBindingProps) => {
	return (
		<div className="space-y-3">
			<div className="flex items-center space-x-2">
				<Link2 className="text-muted-foreground h-4 w-4" />
				<span className="text-sm font-medium">爱发电账号</span>
			</div>

			{data.user.afdian_bound
				? (
						<div className="p-3 border border-green-200 rounded-lg bg-green-50">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<div className="mb-1 flex items-center space-x-2">
										<div className="rounded-full bg-green-500 h-2 w-2"></div>
										<p className="text-sm text-green-800 font-medium">已绑定</p>
									</div>
									<div className="text-xs text-green-600 space-y-1">
										{data.user.afdian_username && (
											<p>
												用户名: @
												{data.user.afdian_username}
											</p>
										)}
										{data.user.afdian_user_id && (
											<p>
												ID:
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
									className="text-green-700 ml-3 border-green-300 hover:bg-green-100"
								>
									<Unlink className="mr-1 h-3 w-3" />
									解绑
								</Button>
							</div>
						</div>
					)
				: (
						<div className="space-y-3">
							<div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
								<div className="flex items-center space-x-3">
									<div className="rounded-full bg-orange-500 h-2 w-2"></div>
									<div>
										<p className="text-sm text-orange-800 font-medium">未绑定爱发电账号</p>
										<p className="text-xs text-orange-600">绑定后可享受订阅功能</p>
									</div>
								</div>
							</div>

							<div className="flex gap-2">
								<Button
									size="sm"
									onClick={onAfdianAuth}
									className="text-white bg-orange-500 flex-1 hover:bg-orange-600"
								>
									<Link2 className="mr-1 h-3 w-3" />
									OAuth绑定
								</Button>

								<Dialog open={orderIdDialogOpen} onOpenChange={onOrderIdDialogOpenChange}>
									<DialogTrigger asChild>
										<Button size="sm" variant="outline" className="flex-1">
											订单号绑定
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[425px]">
										<DialogHeader>
											<DialogTitle>通过订单号绑定爱发电账号</DialogTitle>
											<DialogDescription>
												请输入您在爱发电的任意一笔订单号，我们将通过订单号查询并绑定您的爱发电账号。
											</DialogDescription>
										</DialogHeader>
										<div className="py-4 gap-4 grid">
											<div className="gap-2 grid">
												<Label htmlFor="order-id">订单号</Label>
												<Input
													id="order-id"
													placeholder="请输入爱发电订单号"
													value={orderId}
													onChange={e => onOrderIdChange(e.target.value)}
													disabled={orderBindLoading}
												/>
											</div>
											{error && (
												<Alert variant="destructive">
													<AlertDescription>{error}</AlertDescription>
												</Alert>
											)}
										</div>
										<div className="flex justify-end space-x-2">
											<Button
												variant="outline"
												onClick={() => {
													onOrderIdDialogOpenChange(false);
													onOrderIdChange("");
													onErrorClear();
												}}
												disabled={orderBindLoading}
											>
												取消
											</Button>
											<Button
												onClick={onOrderIdBind}
												disabled={orderBindLoading || !orderId.trim()}
											>
												{orderBindLoading ? "绑定中..." : "确认绑定"}
											</Button>
										</div>
									</DialogContent>
								</Dialog>
							</div>
						</div>
					)}
		</div>
	);
};

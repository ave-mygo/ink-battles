"use client";

import type { UserSubscriptionData } from "@/lib/subscription";
import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AfdianBinding } from "./AfdianBinding";

interface UserInfoCardProps {
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

export const UserInfoCard = ({
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
}: UserInfoCardProps) => {
	const displayName = data.user.username || data.user.email || "用户";
	const initial = (displayName[0] || "?").toUpperCase();
	// 头像优先级：QQ > 爱发电 > 默认
	const avatarSrc = data.user.avatar || data.user.afdian_avatar;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center">
					<User className="mr-2 h-5 w-5" />
					用户信息
				</CardTitle>
				<CardDescription>您的账户基本信息</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex items-start space-x-4">
					<Avatar className="flex-shrink-0 h-16 w-16">
						<AvatarImage src={avatarSrc} alt={displayName} />
						<AvatarFallback className="text-lg">{initial}</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<h3 className="text-xl font-semibold truncate">{displayName}</h3>
						<p className="text-muted-foreground text-sm truncate">{data.user.email || "未设置邮箱"}</p>
						{data.user.afdian_bound && data.user.afdian_username && (
							<div className="mt-1 flex items-center space-x-2">
								<div className="rounded-full bg-green-500 h-2 w-2"></div>
								<p className="text-muted-foreground text-xs">
									爱发电: @
									{data.user.afdian_username}
								</p>
							</div>
						)}
					</div>
				</div>

				<Separator />

				<AfdianBinding
					data={data}
					bindLoading={bindLoading}
					orderIdDialogOpen={orderIdDialogOpen}
					orderId={orderId}
					orderBindLoading={orderBindLoading}
					error={error}
					onUnbindAfdian={onUnbindAfdian}
					onAfdianAuth={onAfdianAuth}
					onOrderIdDialogOpenChange={onOrderIdDialogOpenChange}
					onOrderIdChange={onOrderIdChange}
					onOrderIdBind={onOrderIdBind}
					onErrorClear={onErrorClear}
				/>
			</CardContent>
		</Card>
	);
};

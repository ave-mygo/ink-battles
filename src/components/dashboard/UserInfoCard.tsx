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
	onUnbindAfdian: () => void;
	onAfdianAuth: () => void;
}

export const UserInfoCard = ({
	data,
	bindLoading,
	onUnbindAfdian,
	onAfdianAuth,
}: UserInfoCardProps) => {
	const displayName = data.user.username || data.user.email || "用户";
	const initial = (displayName[0] || "?").toUpperCase();
	// 头像优先级：QQ > 爱发电 > 默认
	const avatarSrc = data.user.avatar || data.user.afdian_avatar;

	return (
		<Card className="min-w-0 w-full">
			<CardHeader>
				<CardTitle className="flex items-center">
					<User className="mr-2 h-5 w-5" />
					用户信息
				</CardTitle>
				<CardDescription>您的账户基本信息</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 sm:space-y-6">
				<div className="flex items-start space-x-3 sm:space-x-4">
					<Avatar className="flex-shrink-0 h-12 w-12 sm:h-16 sm:w-16">
						<AvatarImage src={avatarSrc} alt={displayName} />
						<AvatarFallback className="text-sm sm:text-lg">{initial}</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<h3 className="text-lg font-semibold truncate sm:text-xl">{displayName}</h3>
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
					onUnbindAfdian={onUnbindAfdian}
					onAfdianAuth={onAfdianAuth}
				/>
			</CardContent>
		</Card>
	);
};

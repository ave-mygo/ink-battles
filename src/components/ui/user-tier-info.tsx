"use client";

import { Crown, Gift, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	calculateAdvancedModelCalls,
	getUserType,
	MEMBERSHIP_TIERS,
	USER_LIMITS,
	UserType,
} from "@/lib/constants";
import { useAuth } from "@/lib/use-auth";

interface UserTierInfoProps {
	className?: string;
}

interface UserTierData {
	userType: UserType;
	displayName: string;
	icon: React.ReactNode;
	badgeVariant: "default" | "secondary" | "destructive" | "outline";
	badgeColor: string;
	perRequest: string;
	dailyLimit: string;
	advancedModelCalls: string;
	donationAmount?: number;
	nextTierInfo?: {
		amount: number;
		calls: number;
	};
}

export default function UserTierInfo({ className }: UserTierInfoProps) {
	const { user, loading } = useAuth();
	const [tierData, setTierData] = useState<UserTierData | null>(null);
	const [subscriptionLoading, setSubscriptionLoading] = useState(false);

	useEffect(() => {
		async function fetchUserTierData() {
			if (loading)
				return;

			let userType = UserType.GUEST;
			let donationAmount = 0;

			if (user?.isLoggedIn && user.email) {
				setSubscriptionLoading(true);
				try {
					const subscriptionData = await fetch("/api/user/subscription").then(res => res.json());
					if (subscriptionData.subscription?.totalAmount) {
						donationAmount = subscriptionData.subscription.totalAmount;
					}
				} catch (error) {
					console.warn("获取订阅信息失败:", error);
				} finally {
					setSubscriptionLoading(false);
				}
			}

			userType = getUserType(user?.isLoggedIn || false, donationAmount);
			const limits = USER_LIMITS[userType];

			let displayName = "";
			let icon: React.ReactNode = null;
			let badgeVariant: UserTierData["badgeVariant"] = "outline";
			let badgeColor = "";

			switch (userType) {
				case UserType.GUEST: {
					displayName = "游客用户";
					icon = <Users className="h-4 w-4" />;
					badgeVariant = "outline";
					badgeColor = "text-gray-600 bg-gray-50 border-gray-200";
					break;
				}
				case UserType.REGULAR: {
					displayName = "普通用户";
					icon = <Gift className="h-4 w-4" />;
					badgeVariant = "secondary";
					badgeColor = "text-blue-600 bg-blue-50 border-blue-200";
					break;
				}
				case UserType.MEMBER: {
					displayName = "会员用户";
					icon = <Crown className="h-4 w-4" />;
					badgeVariant = "default";
					badgeColor = "text-yellow-700 bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300";
					break;
				}
			}

			const perRequest = limits.perRequest ? `${limits.perRequest.toLocaleString()} 字` : "无限制";
			const dailyLimit = limits.dailyLimit ? `${limits.dailyLimit.toLocaleString()} 字` : "无限制";

			let advancedModelCalls = "0 次";
			if (userType === UserType.MEMBER && donationAmount > 0) {
				const calls = calculateAdvancedModelCalls(donationAmount);
				advancedModelCalls = `${calls.toLocaleString()} 次`;
			}

			// 计算下一档位信息
			let nextTierInfo: UserTierData["nextTierInfo"];
			if (userType === UserType.MEMBER && donationAmount > 0) {
				const nextTier = MEMBERSHIP_TIERS.find(tier => tier.minAmount > donationAmount);

				if (nextTier && nextTier.maxAmount !== Number.POSITIVE_INFINITY) {
					const nextTierCalls = calculateAdvancedModelCalls(nextTier.minAmount);
					nextTierInfo = {
						amount: nextTier.minAmount,
						calls: nextTierCalls,
					};
				}
			}

			setTierData({
				userType,
				displayName,
				icon,
				badgeVariant,
				badgeColor,
				perRequest,
				dailyLimit,
				advancedModelCalls,
				donationAmount,
				nextTierInfo,
			});
		}

		fetchUserTierData();
	}, [user, loading]);

	if (loading || subscriptionLoading) {
		return (
			<Card className={className}>
				<CardContent className="p-4">
					<div className="animate-pulse space-y-2">
						<div className="rounded bg-gray-200 h-4 w-1/2"></div>
						<div className="rounded bg-gray-200 h-3 w-3/4"></div>
						<div className="rounded bg-gray-200 h-3 w-2/3"></div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!tierData)
		return null;

	return (
		<Card className={className}>
			<CardContent className="p-4 space-y-3">
				<div className="flex gap-2 items-center">
					{tierData.icon}
					<span className="font-medium">{tierData.displayName}</span>
					<Badge variant={tierData.badgeVariant} className={tierData.badgeColor}>
						{tierData.displayName}
					</Badge>
				</div>

				<div className="text-sm space-y-2">
					<div className="flex justify-between">
						<span className="text-muted-foreground">单次分析限制:</span>
						<span className="font-medium">{tierData.perRequest}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">每日累计限制:</span>
						<span className="font-medium">{tierData.dailyLimit}</span>
					</div>
				</div>

			</CardContent>
		</Card>
	);
}

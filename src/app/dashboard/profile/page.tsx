import type { Metadata } from "next";
import { User } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { AccountStatusCard } from "@/components/dashboard/profile/AccountStatusCard";
import { BasicInfoCard } from "@/components/dashboard/profile/BasicInfoCard";
import { ProfileHeader } from "@/components/dashboard/profile/ProfileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardUserInfo } from "@/utils/dashboard";

export const metadata: Metadata = {
	title: "用户信息",
	description: "查看和管理您的个人资料",
};

export default async function ProfilePage() {
	const user = await getDashboardUserInfo();

	if (!user) {
		return (
			<div className="flex h-full items-center justify-center">
				<Card className="border-0 rounded-2xl bg-white/80 shadow-lg backdrop-blur-lg">
					<CardContent className="pt-6">
						<p className="text-slate-600">无法加载用户信息</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<DashboardPageHeader
				icon={User}
				title="用户信息"
				description="查看和管理您的个人资料"
			/>

			<ProfileHeader user={user} />

			<div className="gap-6 grid md:grid-cols-2">
				<BasicInfoCard user={user} />
				<AccountStatusCard user={user} />
			</div>
		</div>
	);
}

"use client";

import type { AuthUserInfoSafe } from "@/types/users/user";
import { User } from "lucide-react";
import ProfileAvatar from "@/components/dashboard/ProfileAvatar";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileHeaderProps {
	user: AuthUserInfoSafe;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
	const getUserDisplayName = () => {
		if (user.email) {
			return user.email.split("@")[0];
		}
		return `用户 ${user.uid}`;
	};

	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
			<CardContent className="pt-6">
				<div className="flex flex-col gap-4 items-center sm:flex-row sm:gap-6">
					<ProfileAvatar
						alt={getUserDisplayName()}
						fallbackName={getUserDisplayName()}
						className="rounded-full h-24 w-24 ring-4 ring-slate-200 dark:ring-slate-700"
					/>
					<div className="flex flex-col gap-2 items-center sm:items-start">
						<h2 className="text-2xl text-slate-900 font-bold dark:text-slate-100">
							{getUserDisplayName()}
						</h2>
						<p className="text-sm text-slate-600 flex gap-2 items-center dark:text-slate-400">
							<User className="h-4 w-4" />
							UID:
							{" "}
							{user.uid}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

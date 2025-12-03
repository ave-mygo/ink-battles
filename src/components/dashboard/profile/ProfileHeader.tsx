"use client";

import type { AuthUserInfoSafe } from "@/types/users/user";
import { Check, Pencil, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import ProfileAvatar from "@/components/dashboard/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateUserProfile } from "@/utils/dashboard/server";

interface ProfileHeaderProps {
	user: AuthUserInfoSafe;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
	const router = useRouter();

	// 编辑状态
	const [isEditingNickname, setIsEditingNickname] = useState(false);
	const [isEditingBio, setIsEditingBio] = useState(false);

	// 编辑值
	const [nicknameValue, setNicknameValue] = useState(user.nickname || "");
	const [bioValue, setBioValue] = useState(user.bio || "");

	// 保存状态
	const [isSaving, setIsSaving] = useState(false);

	const getDefaultDisplayName = () => {
		if (user.email) {
			return user.email.split("@")[0];
		}
		return `用户 ${user.uid}`;
	};

	const getUserDisplayName = () => {
		return user.nickname || getDefaultDisplayName();
	};

	const handleSaveNickname = async () => {
		setIsSaving(true);
		try {
			const result = await updateUserProfile({ nickname: nicknameValue });
			if (result.success) {
				toast.success("昵称更新成功");
				setIsEditingNickname(false);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} catch {
			toast.error("更新失败，请稍后重试");
		} finally {
			setIsSaving(false);
		}
	};

	const handleSaveBio = async () => {
		setIsSaving(true);
		try {
			const result = await updateUserProfile({ bio: bioValue });
			if (result.success) {
				toast.success("签名更新成功");
				setIsEditingBio(false);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} catch {
			toast.error("更新失败，请稍后重试");
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancelNickname = () => {
		setNicknameValue(user.nickname || "");
		setIsEditingNickname(false);
	};

	const handleCancelBio = () => {
		setBioValue(user.bio || "");
		setIsEditingBio(false);
	};

	return (
		<Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
			<CardContent className="pt-6">
				<div className="flex flex-col gap-4 items-center sm:flex-row sm:gap-6 sm:items-start">
					<ProfileAvatar
						alt={getUserDisplayName()}
						fallbackName={getUserDisplayName()}
						className="rounded-full shrink-0 h-24 w-24 ring-4 ring-slate-200 dark:ring-slate-700"
					/>
					<div className="flex flex-1 flex-col gap-2 items-center sm:items-start">
						{/* 昵称区域 - 固定高度防止布局抖动 */}
						<div className="flex h-9 items-center">
							{isEditingNickname
								? (
										<div className="flex gap-2 max-w-sm w-full items-center">
											<Input
												value={nicknameValue}
												onChange={e => setNicknameValue(e.target.value)}
												placeholder={getDefaultDisplayName()}
												maxLength={20}
												className="flex-1"
												autoFocus
											/>
											<Button
												size="icon"
												variant="ghost"
												onClick={handleSaveNickname}
												disabled={isSaving}
												className="text-green-600 h-8 w-8 cursor-pointer dark:text-green-400 hover:text-green-700 hover:bg-green-50 dark:hover:text-green-300 dark:hover:bg-green-950/50"
											>
												<Check className="h-4 w-4" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												onClick={handleCancelNickname}
												disabled={isSaving}
												className="text-slate-500 h-8 w-8 cursor-pointer dark:text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800"
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									)
								: (
										<div className="group flex gap-2 items-center">
											<h2 className="text-2xl text-slate-900 font-bold dark:text-slate-100">
												{getUserDisplayName()}
											</h2>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => setIsEditingNickname(true)}
												className="text-slate-400 opacity-0 h-7 w-7 cursor-pointer transition-opacity dark:text-slate-500 hover:text-slate-600 hover:bg-slate-100 group-hover:opacity-100 dark:hover:text-slate-300 dark:hover:bg-slate-800"
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
										</div>
									)}
						</div>

						{/* UID */}
						<p className="text-sm text-slate-600 flex gap-2 items-center dark:text-slate-400">
							<User className="h-4 w-4" />
							UID:
							{" "}
							{user.uid}
						</p>

						{/* 签名区域 - 固定最小高度防止布局抖动 */}
						<div className="mt-1 max-w-md min-h-16 w-full">
							{isEditingBio
								? (
										<div className="space-y-2">
											<Textarea
												value={bioValue}
												onChange={e => setBioValue(e.target.value)}
												placeholder="写一句个性签名..."
												maxLength={100}
												rows={2}
												className="resize-none"
												autoFocus
											/>
											<div className="flex gap-2 items-center justify-between">
												<span className="text-xs text-slate-400">
													{bioValue.length}
													/100
												</span>
												<div className="flex gap-2">
													<Button
														size="sm"
														variant="outline"
														onClick={handleCancelBio}
														disabled={isSaving}
														className="cursor-pointer"
													>
														取消
													</Button>
													<Button
														size="sm"
														onClick={handleSaveBio}
														disabled={isSaving}
														className="cursor-pointer"
													>
														{isSaving ? "保存中..." : "保存"}
													</Button>
												</div>
											</div>
										</div>
									)
								: (
										<div
											className="group flex gap-2 cursor-pointer items-start"
											onClick={() => setIsEditingBio(true)}
											onKeyDown={e => e.key === "Enter" && setIsEditingBio(true)}
											role="button"
											tabIndex={0}
										>
											<p className="text-sm text-slate-500 italic dark:text-slate-400">
												{user.bio || "点击添加个性签名..."}
											</p>
											<Pencil className="text-slate-400 opacity-0 h-3.5 w-3.5 transition-opacity dark:text-slate-500 group-hover:opacity-100" />
										</div>
									)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

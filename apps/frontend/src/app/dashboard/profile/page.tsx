import type { ApiResult } from "@ink-battles/shared/types/api";
import type { AuthUserInfoSafe } from "@ink-battles/shared/types/users/user";
import type { Metadata } from "next";
import { ExternalLink, User } from "lucide-react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { AccountStatusCard } from "@/components/dashboard/profile/AccountStatusCard";
import { BasicInfoCard } from "@/components/dashboard/profile/BasicInfoCard";
import ProfileAvatar from "@/components/dashboard/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createServerEden } from "@/utils/api/eden-server";
import { createAuthPanelUrl } from "@/utils/auth/redirect";

export const metadata: Metadata = {
  title: "用户信息",
  description: "用户资料由 Minato Auth 统一管理，Ink Battles 只读取当前登录状态。",
};

export default async function ProfilePage() {
  const api = await createServerEden();
  const { data, error } = await api.api.v2.auth.me.get();
  const response = (data ?? error) as ApiResult<AuthUserInfoSafe | null>;
  const user = response.success ? response.data ?? null : null;

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
        description="查看个人资料；修改昵称、签名和登录身份请前往 Minato Auth"
      />

      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4 items-center">
              <ProfileAvatar
                alt={user.nickname || user.email?.split("@")[0] || `用户 ${user.uid}`}
                avatar={user.avatar}
                fallbackName={user.nickname || user.email?.split("@")[0] || `用户 ${user.uid}`}
                className="h-20 w-20 shrink-0 rounded-full ring-4 ring-slate-200 dark:ring-slate-700"
              />
              <div className="space-y-2">
                <h2 className="text-2xl text-slate-900 font-bold dark:text-slate-100">
                  {user.nickname || user.email?.split("@")[0] || `用户 ${user.uid}`}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {user.bio || "暂无个性签名"}
                </p>
              </div>
            </div>
            <Button asChild className="cursor-pointer">
              <Link href={createAuthPanelUrl()} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                前往 Minato Auth 管理
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="gap-6 grid md:grid-cols-2">
        <BasicInfoCard user={user} />
        <AccountStatusCard user={user} />
      </div>
    </div>
  );
}

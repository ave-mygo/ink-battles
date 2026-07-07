import type { AccountBindingsDetails } from "@ink-battles/shared/types/common/accounts";
import type { Metadata } from "next";
import { ExternalLink, Link2, Mail } from "lucide-react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";
import { createAuthPanelUrl } from "@/utils/auth/redirect";

export const metadata: Metadata = {
  title: "账号绑定与管理",
  description: "查看账号绑定状态，并前往 Minato 管理登录方式",
};

export default async function AccountsPage() {
  const api = await createServerEden();
  const response = await api.api.v2.accounts.details.get();
  const bindings = await unwrapEdenPayload<AccountBindingsDetails>(response.data, response.error, {
    email: { bound: false },
    qq: { bound: false },
    afdian: { bound: false },
    loginMethod: null,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DashboardPageHeader
        icon={Link2}
        title="账号绑定"
        description="绑定、解绑和登录方式管理已迁移到 Minato Auth"
      />
      <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-900/80">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <Link2 className="text-primary h-5 w-5" />
            Minato 账号管理
          </CardTitle>
          <CardDescription>
            Ink Battles 只展示当前绑定状态；邮箱、QQ、爱发电的绑定与解绑请在 Minato Auth 中完成。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BindingStatus label="邮箱账号" value={bindings.email.value} bound={bindings.email.bound} current={bindings.loginMethod === "email"} />
          <BindingStatus label="QQ 账号" value={bindings.qq.value} bound={bindings.qq.bound} current={bindings.loginMethod === "qq"} />
          <BindingStatus label="爱发电账号" value={bindings.afdian.value} bound={bindings.afdian.bound} current={bindings.loginMethod === "afd"} />
          <Button asChild className="w-full cursor-pointer sm:w-auto">
            <Link href={createAuthPanelUrl()} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              前往 Minato Auth 绑定
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BindingStatus({
  label,
  value,
  bound,
  current,
}: {
  label: string;
  value?: string | null;
  bound: boolean;
  current: boolean;
}) {
  return (
    <div className="p-4 border rounded-lg flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="text-blue-600 rounded-full bg-blue-100 flex shrink-0 h-10 w-10 items-center justify-center dark:text-blue-400 dark:bg-blue-900/30">
          <Mail className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm leading-none font-medium flex gap-2 items-center">
            {label}
            {current && <Badge variant="secondary" className="text-xs font-normal">当前登录</Badge>}
          </p>
          <p className="text-muted-foreground text-sm truncate">
            {bound ? (value || "已绑定") : "未绑定"}
          </p>
        </div>
      </div>
      <Badge variant={bound ? "default" : "outline"}>
        {bound ? "已绑定" : "未绑定"}
      </Badge>
    </div>
  );
}

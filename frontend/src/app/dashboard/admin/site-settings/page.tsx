import type { SiteSettingHistoryItem, SiteSettingMeta } from "@ink-battles/shared/types/common";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSiteSettingsPanel } from "@/components/dashboard/admin/AdminSiteSettingsPanel";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";
import { getCurrentUserInfo } from "@/utils/auth/server";

export const metadata: Metadata = {
  title: "站点配置",
  description: "管理员维护站点运行时配置",
};

/**
 * 站点配置后台页面。
 */
export default async function AdminSiteSettingsPage() {
  const user = await getCurrentUserInfo();
  if (!user?.isAdmin)
    redirect("/dashboard/profile");

  const api = await createServerEden();
  const [settingsResponse, historyResponse] = await Promise.all([
    api.api.v2.admin["site-settings"].get(),
    api.api.v2.admin["site-settings"].history.get(),
  ]);

  const settingsPayload = await unwrapEdenPayload<{ success: boolean; data?: SiteSettingMeta[] }>(
    settingsResponse.data,
    settingsResponse.error,
    { success: false, data: [] },
  );
  const historyPayload = await unwrapEdenPayload<{ success: boolean; data?: SiteSettingHistoryItem[] }>(
    historyResponse.data,
    historyResponse.error,
    { success: false, data: [] },
  );

  return (
    <AdminSiteSettingsPanel
      initialSettings={settingsPayload.data ?? []}
      initialHistory={historyPayload.data ?? []}
    />
  );
}

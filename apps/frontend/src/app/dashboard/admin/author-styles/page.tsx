import type { AuthorStyleLibraryListResponse, AuthorStyleSetting, SiteSettingMeta } from "@ink-battles/shared/types/common";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAuthorStylesPanel } from "@/components/dashboard/admin/AdminAuthorStylesPanel";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";
import { getCurrentUserInfo } from "@/utils/auth/server";

export const metadata: Metadata = {
  title: "作者风格库",
  description: "管理员维护作者风格画像与向量索引",
};

/**
 * 作者风格库后台页面。
 */
export default async function AdminAuthorStylesPage() {
  const user = await getCurrentUserInfo();
  if (!user?.isAdmin)
    redirect("/dashboard/profile");

  const api = await createServerEden();
  const [response, settingsResponse] = await Promise.all([
    api.api.v2.admin["author-styles"].get(),
    api.api.v2.admin["site-settings"].get(),
  ]);
  const payload = await unwrapEdenPayload<{ success: boolean; data?: AuthorStyleLibraryListResponse }>(
    response.data,
    response.error,
    { success: false, data: { items: [], total: 0 } },
  );
  const settingsPayload = await unwrapEdenPayload<{ success: boolean; data?: SiteSettingMeta[] }>(
    settingsResponse.data,
    settingsResponse.error,
    { success: false, data: [] },
  );
  const authorStyleSetting = settingsPayload.data?.find(setting => setting.key === "ai.authorStyle")?.value as AuthorStyleSetting | undefined;

  return (
    <AdminAuthorStylesPanel
      initialItems={payload.data?.items ?? []}
      initialSetting={authorStyleSetting ?? { enabled: false, similarityThreshold: 0.72, topK: 1 }}
    />
  );
}

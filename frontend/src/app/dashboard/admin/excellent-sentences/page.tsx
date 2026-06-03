import type { DatabaseExcellentSentence } from "@ink-battles/shared/types/database";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminExcellentSentencesPanel } from "@/components/dashboard/admin/AdminExcellentSentencesPanel";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";
import { getCurrentUserInfo } from "@/utils/auth/server";

export const metadata: Metadata = {
  title: "亮点句子审核",
  description: "管理员审核用户授权收录的亮点句子",
};

/**
 * 亮点句子审核后台页面。
 */
export default async function AdminExcellentSentencesPage() {
  const user = await getCurrentUserInfo();
  if (!user?.isAdmin)
    redirect("/dashboard/profile");

  const api = await createServerEden();
  const response = await api.api.v2.admin["excellent-sentences"].get({ query: { reviewStatus: "pending" } });
  const payload = await unwrapEdenPayload<{ success: boolean; data?: DatabaseExcellentSentence[] }>(
    response.data,
    response.error,
    { success: false, data: [] },
  );

  return <AdminExcellentSentencesPanel initialSentences={payload.data ?? []} />;
}

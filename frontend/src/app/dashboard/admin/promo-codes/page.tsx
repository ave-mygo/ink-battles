import type { AdminPromoCodeListData } from "@ink-battles/shared/types/database/promo_code";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPromoCodesPanel } from "@/components/dashboard/admin/AdminPromoCodesPanel";
import { unwrapEdenPayload } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";
import { getCurrentUserInfo } from "@/utils/auth/server";

export const metadata: Metadata = {
  title: "优惠码管理",
  description: "管理员生成和查看订单优惠码",
};

/**
 * 优惠码后台页面。
 */
export default async function AdminPromoCodesPage() {
  const user = await getCurrentUserInfo();
  if (!user?.isAdmin)
    redirect("/dashboard/profile");

  const api = await createServerEden();
  const response = await api.api.v2.admin["promo-codes"].get();
  const payload = await unwrapEdenPayload<{ success: boolean; data?: AdminPromoCodeListData }>(
    response.data,
    response.error,
    { success: false, data: { codes: [], recentRedemptions: [] } },
  );

  return <AdminPromoCodesPanel initialData={payload.data ?? { codes: [], recentRedemptions: [] }} />;
}

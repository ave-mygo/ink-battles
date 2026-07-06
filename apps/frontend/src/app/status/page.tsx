import type { StatusApiResponse } from "@ink-battles/shared/types/common/status";
import type { Metadata } from "next";
import StatusDashboard from "@/components/layouts/Status/StatusDashboard";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "系统状态",
    description: "查看系统运行状态、服务可用性和性能监控信息",
  };
}

export default async function StatusPage() {
  const api = await createServerEden();
  const response = await api.api.v2.status.get({
    query: { page: 1, pageSize: 20 },
  });
  const initialData = await normalizeEdenResult<StatusApiResponse>(response.data, response.error, "加载系统状态失败");

  return (
    <div className="min-h-screen from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto px-4 py-8 container max-w-7xl">
        <StatusDashboard initialData={initialData} />
      </div>
    </div>
  );
}

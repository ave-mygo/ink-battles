import type { HistoryRecordResult } from "@ink-battles/shared/types/common/history";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoryDetailView } from "@/components/dashboard/history/HistoryDetailView";
import { Button } from "@/components/ui/button";
import { normalizeEdenResult } from "@/utils/api/eden-response";
import { createServerEden } from "@/utils/api/eden-server";

interface HistoryDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `分析记录详情`,
    description: "查看分析记录的详细信息",
  };
}

export default async function HistoryDetailPage({ params }: HistoryDetailPageProps) {
  const { id } = await params;
  const api = await createServerEden();
  const response = await api.api.v2.analysis.history({ id }).get();
  const result = await normalizeEdenResult<HistoryRecordResult>(response.data, response.error, "记录不存在");

  if (!result.success || !result.data?.record) {
    notFound();
  }

  const record = result.data.record;
  const percentileData = null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 返回按钮 */}
      <div className="flex gap-4 items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回历史记录
          </Link>
        </Button>
      </div>

      {/* 详情视图 */}
      <HistoryDetailView
        record={record}
        showShareControls={true}
        percentileData={percentileData}
      />
    </div>
  );
}

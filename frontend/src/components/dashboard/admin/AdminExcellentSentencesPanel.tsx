"use client";

import type {
  DatabaseExcellentSentence,
  ExcellentSentenceDisplayStatus,
  ExcellentSentenceRecommendationStatus,
  ExcellentSentenceReviewStatus,
} from "@ink-battles/shared/types/database";
import { Check, Eye, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult, unwrapEdenPayload } from "@/utils/api/eden-response";

interface AdminExcellentSentencesPanelProps {
  initialSentences: DatabaseExcellentSentence[];
}

type ReviewFilter = "all" | ExcellentSentenceReviewStatus;

const REVIEW_STATUS_LABELS: Record<ExcellentSentenceReviewStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

const RECOMMENDATION_STATUS_LABELS: Record<ExcellentSentenceRecommendationStatus, string> = {
  none: "未推荐",
  candidate: "候选推荐",
  recommended: "已推荐",
};

const DISPLAY_STATUS_LABELS: Record<ExcellentSentenceDisplayStatus, string> = {
  hidden: "隐藏",
  public: "公开",
};

/**
 * 亮点句子审核后台面板。
 */
export function AdminExcellentSentencesPanel({ initialSentences }: AdminExcellentSentencesPanelProps) {
  const [sentences, setSentences] = useState(initialSentences);
  const [filter, setFilter] = useState<ReviewFilter>("pending");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSentences = async (nextFilter: ReviewFilter = filter) => {
    const response = await createClientEden().api.v2.admin["excellent-sentences"].get({
      query: { reviewStatus: nextFilter },
    });
    const payload = await unwrapEdenPayload<{ success: boolean; data?: DatabaseExcellentSentence[]; message?: string }>(
      response.data,
      response.error,
      { success: false, data: [] },
    );
    setSentences(payload.data ?? []);
    return payload;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const payload = await loadSentences();
      if (!payload.success) {
        toast.error(payload.message ?? "刷新失败");
        return;
      }
      toast.success("句子列表已刷新");
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateSentence = async (
    sentence: DatabaseExcellentSentence,
    reviewStatus: ExcellentSentenceReviewStatus,
    recommendationStatus: ExcellentSentenceRecommendationStatus,
    displayStatus: ExcellentSentenceDisplayStatus,
  ) => {
    if (!sentence._id)
      return;

    setSavingId(sentence._id);
    try {
      const response = await createClientEden().api.v2.admin["excellent-sentences"]({ id: sentence._id }).patch({
        reviewStatus,
        recommendationStatus,
        displayStatus,
      });
      const result = await normalizeEdenResult<{ success: boolean; message?: string }>(response.data, response.error, "保存失败");
      if (!result.success) {
        toast.error(result.message ?? "保存失败");
        return;
      }
      toast.success("审核状态已更新");
      await loadSentences();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">亮点句子审核</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            审核用户授权收录的句子，并决定是否进入推荐和公开展示。
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={filter}
            onValueChange={(value) => {
              const nextFilter = value as ReviewFilter;
              setFilter(nextFilter);
              void loadSentences(nextFilter);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            disabled={isRefreshing}
            onClick={handleRefresh}
            className="cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "刷新中" : "刷新"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">句子列表</CardTitle>
          <CardDescription>通过后仍可选择隐藏；公开展示只应给已通过内容。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>句子</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sentences.map(sentence => (
                <TableRow key={sentence._id}>
                  <TableCell className="max-w-xl whitespace-normal">
                    <p className="text-sm leading-relaxed">{sentence.content}</p>
                    {sentence.metadata?.reason && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{sentence.metadata.reason}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{sentence.authorName}</div>
                      <div className="text-xs text-slate-500">UID: {sentence.uid}</div>
                      <div className="text-xs text-slate-500">{sentence.workName ?? "未填写作品"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline">{REVIEW_STATUS_LABELS[sentence.reviewStatus]}</Badge>
                      <Badge variant="outline">{RECOMMENDATION_STATUS_LABELS[sentence.recommendationStatus]}</Badge>
                      <Badge variant="outline">{DISPLAY_STATUS_LABELS[sentence.displayStatus]}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={savingId === sentence._id}
                        onClick={() => updateSentence(sentence, "approved", "candidate", "hidden")}
                        className="cursor-pointer"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingId === sentence._id}
                        onClick={() => updateSentence(sentence, "approved", "recommended", "public")}
                        className="cursor-pointer"
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        推荐公开
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={savingId === sentence._id}
                        onClick={() => updateSentence(sentence, "rejected", "none", "hidden")}
                        className="cursor-pointer"
                      >
                        <X className="mr-1 h-4 w-4" />
                        拒绝
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

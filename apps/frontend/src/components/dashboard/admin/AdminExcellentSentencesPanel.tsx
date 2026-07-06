"use client";

import type {
  DatabaseExcellentSentence,
  ExcellentSentenceRecommendationStatus,
  ExcellentSentenceReviewStatus,
} from "@ink-battles/shared/types/database";
import { BookOpen, Check, Eye, RefreshCw, User, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult, unwrapEdenPayload } from "@/utils/api/eden-response";

interface AdminExcellentSentencesPanelProps {
  initialSentences: DatabaseExcellentSentence[];
}

type ReviewFilter = "pending" | "approved-normal" | "approved-recommended" | "rejected" | "approved" | "all";

interface ReviewFilterQuery {
  reviewStatus: "all" | ExcellentSentenceReviewStatus;
  recommendationStatus?: "none" | "recommended" | "not_recommended";
}

const REVIEW_STATUS_LABELS: Record<ExcellentSentenceReviewStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

const RECOMMENDATION_STATUS_LABELS: Record<ExcellentSentenceRecommendationStatus, string> = {
  none: "未推荐",
  recommended: "已推荐",
};

const REVIEW_FILTER_QUERIES: Record<ReviewFilter, ReviewFilterQuery> = {
  "pending": { reviewStatus: "pending" },
  "approved-normal": { reviewStatus: "approved", recommendationStatus: "not_recommended" },
  "approved-recommended": { reviewStatus: "approved", recommendationStatus: "recommended" },
  "rejected": { reviewStatus: "rejected" },
  "approved": { reviewStatus: "approved" },
  "all": { reviewStatus: "all" },
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
      query: REVIEW_FILTER_QUERIES[nextFilter],
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
  ) => {
    if (!sentence._id)
      return;

    setSavingId(sentence._id);
    try {
      const response = await createClientEden().api.v2.admin["excellent-sentences"]({ id: sentence._id }).patch({
        reviewStatus,
        recommendationStatus,
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
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            普通句子进入公开池；推荐句子进入更高优先级的展示池。
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
            <SelectTrigger className="w-40 cursor-pointer bg-white dark:bg-slate-950">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved-normal">普通句子</SelectItem>
              <SelectItem value="approved-recommended">推荐句子</SelectItem>
              <SelectItem value="rejected">已驳回</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
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

      <div className="space-y-3">
        {sentences.map(sentence => (
          <SentenceReviewCard
            key={sentence._id}
            sentence={sentence}
            saving={savingId === sentence._id}
            onUpdate={updateSentence}
          />
        ))}
        {sentences.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              当前筛选条件下没有需要处理的亮点句子。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SentenceReviewCard({ sentence, saving, onUpdate }: {
  sentence: DatabaseExcellentSentence;
  saving: boolean;
  onUpdate: (
    sentence: DatabaseExcellentSentence,
    reviewStatus: ExcellentSentenceReviewStatus,
    recommendationStatus: ExcellentSentenceRecommendationStatus,
  ) => Promise<void>;
}) {
  const workName = sentence.workName?.trim() || "未填写作品";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-slate-500" />
              <span className="wrap-break-word">{workName}</span>
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {sentence.authorName}
              </span>
              <span>
                UID:
                {" "}
                {sentence.uid}
              </span>
              <span>{sentence.metadata?.sourceType === "custom_upload" ? "手动上传" : "分析结果收录"}</span>
            </CardDescription>
          </div>
          <StatusBadges sentence={sentence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <blockquote className="rounded-md border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100">
          {sentence.content}
        </blockquote>
        {sentence.metadata?.reason && (
          <p className="rounded-md border bg-white px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            {sentence.metadata.reason}
          </p>
        )}
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
          <SentenceReviewActions sentence={sentence} saving={saving} onUpdate={onUpdate} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadges({ sentence }: { sentence: DatabaseExcellentSentence }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">{REVIEW_STATUS_LABELS[sentence.reviewStatus]}</Badge>
      <Badge variant="outline">{RECOMMENDATION_STATUS_LABELS[sentence.recommendationStatus]}</Badge>
    </div>
  );
}

function SentenceReviewActions({ sentence, saving, onUpdate }: {
  sentence: DatabaseExcellentSentence;
  saving: boolean;
  onUpdate: (
    sentence: DatabaseExcellentSentence,
    reviewStatus: ExcellentSentenceReviewStatus,
    recommendationStatus: ExcellentSentenceRecommendationStatus,
  ) => Promise<void>;
}) {
  const isApproved = sentence.reviewStatus === "approved";
  const isRecommended = sentence.recommendationStatus === "recommended";

  return (
    <div className="flex flex-wrap gap-2">
      {(!isApproved || isRecommended) && (
        <Button
          size="sm"
          disabled={saving}
          onClick={() => onUpdate(sentence, "approved", "none")}
          className="cursor-pointer disabled:cursor-not-allowed"
        >
          <Check className="mr-1 h-4 w-4" />
          {isApproved ? "改为普通句子" : "通过为普通句子"}
        </Button>
      )}
      {(!isApproved || !isRecommended) && (
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => onUpdate(sentence, "approved", "recommended")}
          className="cursor-pointer disabled:cursor-not-allowed"
        >
          <Eye className="mr-1 h-4 w-4" />
          {isApproved ? "改为推荐句子" : "推荐公开"}
        </Button>
      )}
      {sentence.reviewStatus !== "rejected" && (
        <RejectAction sentence={sentence} saving={saving} onUpdate={onUpdate} />
      )}
    </div>
  );
}

function RejectAction({ sentence, saving, onUpdate }: {
  sentence: DatabaseExcellentSentence;
  saving: boolean;
  onUpdate: (
    sentence: DatabaseExcellentSentence,
    reviewStatus: ExcellentSentenceReviewStatus,
    recommendationStatus: ExcellentSentenceRecommendationStatus,
  ) => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed dark:border-red-900/60 dark:hover:bg-red-950/30"
        >
          <X className="mr-1 h-4 w-4" />
          驳回
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认驳回这条亮点句子？</AlertDialogTitle>
          <AlertDialogDescription>
            驳回后该句子不会公开展示，并从待审核队列移出。这个操作适合内容质量不足、来源信息不明确或不适合公开展示的情况。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-red-600 text-white hover:bg-red-700"
            onClick={() => onUpdate(sentence, "rejected", "none")}
          >
            确认驳回
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

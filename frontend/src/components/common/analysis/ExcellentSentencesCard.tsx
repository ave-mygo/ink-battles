"use client";

import type { ExcellentSentenceCandidate } from "@ink-battles/shared/types/ai";
import { BookMarked, CheckCircle2, LogIn, Quote, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser, useIsAuthenticated } from "@/store";
import { collectExcellentSentence, getExcellentSentenceSourceState } from "@/utils/analysis/excellent-sentences";

interface ExcellentSentencesCardProps {
  sentences?: ExcellentSentenceCandidate[];
  sourceArticleId?: string;
}

const NORMALIZE_SENTENCE_REGEX = /[\s\p{P}\p{S}]/gu;

/**
 * 生成与后端一致的句子重复检测指纹。
 */
function normalizeSentenceContent(content: string) {
  return content.trim().replace(NORMALIZE_SENTENCE_REGEX, "").toLowerCase();
}

/**
 * 去掉 AI 结果中重复或空的候选句，避免前端重复展示。
 */
function dedupeCandidates(sentences: ExcellentSentenceCandidate[]) {
  const seen = new Set<string>();
  return sentences.filter((sentence) => {
    const normalized = normalizeSentenceContent(sentence.content);
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  }).slice(0, 2);
}

/**
 * 展示 AI 选择的文句高光，并处理用户授权与来源信息补充。
 *
 * 交互方案选择：候选句直接展示在评分结果面板内，降低用户发现成本和跳转成本；
 * 单句授权、来源补充与最终确认放在弹窗内，避免批量授权误操作并保持提交链路轻量。
 */
export function ExcellentSentencesCard({ sentences = [], sourceArticleId }: ExcellentSentencesCardProps) {
  const user = useCurrentUser();
  const isAuthenticated = useIsAuthenticated();
  const candidates = useMemo(() => dedupeCandidates(sentences), [sentences]);
  const [collectedContents, setCollectedContents] = useState<Set<string>>(new Set());
  const [selectedSentence, setSelectedSentence] = useState<ExcellentSentenceCandidate | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [workName, setWorkName] = useState("");
  const [authorizationAccepted, setAuthorizationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sourceArticleId || !isAuthenticated) {
      return;
    }

    void getExcellentSentenceSourceState(sourceArticleId).then((result) => {
      if (result.success && result.data) {
        setCollectedContents(new Set(result.data.normalizedContents));
      }
    });
  }, [isAuthenticated, sourceArticleId]);

  if (candidates.length === 0) {
    return null;
  }

  const fallbackAuthorName = user?.nickname || "当前用户";

  const openCollectDialog = (sentence: ExcellentSentenceCandidate) => {
    setSelectedSentence(sentence);
    setAuthorName("");
    setWorkName("");
    setAuthorizationAccepted(false);
  };

  const submitCollection = async () => {
    if (!selectedSentence || !sourceArticleId) {
      toast.error("缺少分析记录 ID，无法收录");
      return;
    }
    if (!authorizationAccepted) {
      toast.error("请先确认授权说明");
      return;
    }

    setIsSubmitting(true);
    const result = await collectExcellentSentence({
      content: selectedSentence.content,
      sourceArticleId,
      authorName,
      workName,
      authorizationGranted: authorizationAccepted,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message || "提交优秀句子失败");
      return;
    }

    setCollectedContents(previous => new Set(previous).add(normalizeSentenceContent(selectedSentence.content)));
    setSelectedSentence(null);
    toast.success(result.message || "优秀句子已提交收录");
  };

  return (
    <>
      <Card className="overflow-hidden border border-slate-200/70 bg-white/90 shadow-sm md:col-span-3 dark:border-white/10 dark:bg-slate-950/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex gap-2 items-center">
            <span className="rounded-md bg-slate-900 p-1.5 text-white dark:bg-white dark:text-slate-950">
              <Sparkles className="h-4 w-4" />
            </span>
            文句高光
          </CardTitle>
          <CardDescription>
            AI 只保留最值得被看见的 1 到 2 句，授权后进入站内展示与推荐候选库。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 p-4 space-y-3 sm:p-5 sm:pt-0">
          {candidates.map((sentence, index) => {
            const normalized = normalizeSentenceContent(sentence.content);
            const alreadyCollected = collectedContents.has(normalized);

            return (
              <div
                key={normalized}
                className="group rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-slate-700"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="secondary" className="rounded-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      高光句
                      {index + 1}
                    </Badge>
                    {alreadyCollected && (
                      <Badge className="rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        已收录
                      </Badge>
                    )}
                  </div>

                  <div className="relative rounded-md bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <Quote className="absolute -top-2 left-3 h-4 w-4 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-900 leading-7 dark:text-slate-100">
                      {sentence.content}
                    </p>
                  </div>

                  <div className="flex gap-2 text-xs text-slate-500 leading-relaxed dark:text-slate-400">
                    <BookMarked className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{sentence.reason}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      授权仅针对当前这一句
                    </p>
                    {isAuthenticated
                      ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={alreadyCollected ? "outline" : "default"}
                            disabled={alreadyCollected || !sourceArticleId}
                            onClick={() => openCollectDialog(sentence)}
                            className="w-full cursor-pointer disabled:cursor-not-allowed sm:w-auto"
                          >
                            {alreadyCollected
                              ? (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )
                              : (
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                )}
                            {alreadyCollected ? "已收录" : "收录这句"}
                          </Button>
                        )
                      : (
                          <Button asChild size="sm" variant="outline" className="w-full cursor-pointer sm:w-auto">
                            <Link href="/signin">
                              <LogIn className="mr-2 h-4 w-4" />
                              登录后授权
                            </Link>
                          </Button>
                        )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSentence} onOpenChange={open => !open && setSelectedSentence(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>授权收录这句高光</DialogTitle>
            <DialogDescription>
              平台希望收集你文章中的高光句子，用于站内展示、推荐与内容优化。
            </DialogDescription>
          </DialogHeader>

          {selectedSentence && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 leading-relaxed dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                只有在你主动授权当前句子后，该句子才会进入收录库。未授权句子不会被写入收录库，已提交内容会先处于待审核和隐藏状态。
              </div>

              <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700 leading-relaxed dark:border-slate-800 dark:text-slate-200">
                {selectedSentence.content}
              </div>

              <div className="space-y-2">
                <Label htmlFor="excellent-sentence-author">作者名称（可选）</Label>
                <Input
                  id="excellent-sentence-author"
                  value={authorName}
                  maxLength={80}
                  placeholder={`默认使用：${fallbackAuthorName}`}
                  onChange={event => setAuthorName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excellent-sentence-work">作品名称（可选）</Label>
                <Input
                  id="excellent-sentence-work"
                  value={workName}
                  maxLength={80}
                  placeholder="不填写则仅记录作者信息"
                  onChange={event => setWorkName(event.target.value)}
                />
              </div>

              <Separator />

              <label className="text-sm text-slate-700 flex gap-3 items-start cursor-pointer dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={authorizationAccepted}
                  onChange={event => setAuthorizationAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer"
                />
                <span>
                  我确认授权平台收录该句子，并理解其可用于站内展示、推荐与内容优化。
                </span>
              </label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedSentence(null)} className="cursor-pointer">
              取消
            </Button>
            <Button type="button" onClick={submitCollection} disabled={isSubmitting || !authorizationAccepted} className="cursor-pointer disabled:cursor-not-allowed">
              {isSubmitting ? "提交中" : "确认收录"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

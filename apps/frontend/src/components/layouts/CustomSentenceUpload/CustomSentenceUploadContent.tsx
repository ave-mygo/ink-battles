"use client";

import { AlertCircle, CheckCircle2, PenLine, Quote, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadCustomExcellentSentence } from "@/utils/analysis/excellent-sentences";

const MAX_REASON_LENGTH = 200;

interface CustomSentenceUploadContentProps {
  isAuthenticated: boolean;
  defaultAuthorName?: string;
}

/**
 * 用户自定义句子上传页面。
 *
 * 1. 用户主动填写句子和来源信息。
 * 2. 点击提交即视为同意平台收录。
 * 3. 审核通过前保持隐藏状态，避免未审核内容进入公开展示。
 */
export function CustomSentenceUploadContent({
  isAuthenticated,
  defaultAuthorName = "",
}: CustomSentenceUploadContentProps) {
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [workName, setWorkName] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedContent = content.trim();
  const canSubmit = isAuthenticated && trimmedContent.length > 0 && !isSubmitting;

  /**
   * 提交用户自定义句子，并在成功后保留作者信息方便连续上传。
   */
  const handleSubmit = async () => {
    if (!canSubmit)
      return;

    setIsSubmitting(true);
    const result = await uploadCustomExcellentSentence({
      content: trimmedContent,
      authorName: authorName.trim() || undefined,
      workName: workName.trim() || undefined,
      reason: reason.trim() || undefined,
      authorizationGranted: true,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message || "上传句子失败");
      return;
    }

    toast.success(result.message || "句子已提交");
    setContent("");
    setWorkName("");
    setReason("");
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <div className="mb-8 space-y-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Quote className="size-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">上传亮点句子</h1>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              自定义提交你认可的句子，审核通过后可进入站内展示与推荐候选。
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <PenLine className="size-5" />
                句子信息
              </CardTitle>
              <CardDescription>请提交单个完整句子，并补充可公开展示的署名和作品来源。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!isAuthenticated && (
                <Alert>
                  <AlertCircle className="size-4" />
                  <AlertTitle>需要登录</AlertTitle>
                  <AlertDescription>
                    上传句子需要绑定到你的账号，登录后可以提交并查看后续审核结果。
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="custom-sentence-content">句子内容</Label>
                  <span className="text-xs text-muted-foreground">
                    {content.length}
                  </span>
                </div>
                <Textarea
                  id="custom-sentence-content"
                  value={content}
                  disabled={!isAuthenticated || isSubmitting}
                  placeholder="请输入一个完整、有独立阅读价值的句子"
                  className="min-h-36 resize-y leading-7"
                  onChange={event => setContent(event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="custom-sentence-author">作者名称</Label>
                  <Input
                    id="custom-sentence-author"
                    value={authorName}
                    maxLength={80}
                    disabled={!isAuthenticated || isSubmitting}
                    placeholder="默认使用账号昵称"
                    onChange={event => setAuthorName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-sentence-work">作品名称</Label>
                  <Input
                    id="custom-sentence-work"
                    value={workName}
                    maxLength={80}
                    disabled={!isAuthenticated || isSubmitting}
                    placeholder="可选"
                    onChange={event => setWorkName(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="custom-sentence-reason">推荐理由</Label>
                  <span className="text-xs text-muted-foreground">
                    {reason.length}
                    /
                    {MAX_REASON_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="custom-sentence-reason"
                  value={reason}
                  maxLength={MAX_REASON_LENGTH}
                  disabled={!isAuthenticated || isSubmitting}
                  placeholder="可选，说明这句话的语言、意象、节奏或情绪亮点"
                  className="min-h-24 resize-y"
                  onChange={event => setReason(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {isAuthenticated
                  ? (
                      <Button
                        type="button"
                        disabled={!canSubmit}
                        className="cursor-pointer disabled:cursor-not-allowed"
                        onClick={handleSubmit}
                      >
                        <Send className="size-4" />
                        {isSubmitting ? "提交中" : "提交审核"}
                      </Button>
                    )
                  : (
                      <Button asChild className="cursor-pointer">
                        <Link href="/signin">登录后上传</Link>
                      </Button>
                    )}
                <p className="text-xs leading-5 text-muted-foreground">
                  上传即同意平台在审核通过后将该句子用于站内展示、推荐与内容优化。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-5" />
                提交流程
              </CardTitle>
              <CardDescription>所有手动上传内容都会先进入审核队列。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-1">
                <p className="font-medium text-foreground">1. 上传即同意</p>
                <p>点击上传即视为同意收录与后续展示规则。</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">2. 后台审核</p>
                <p>管理员审核通过前，句子不会公开展示。</p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">3. 公开展示</p>
                <p>审核通过并设置为公开后，才可能出现在站内推荐区域。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

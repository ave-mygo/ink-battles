"use client";

import type { PublicQuote } from "@ink-battles/shared/types/common";
import { Code2, ExternalLink, Quote, RefreshCw, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClientEden } from "@/utils/api/eden-client";
import { unwrapEdenPayload } from "@/utils/api/eden-response";

const SENTENCE_SAMPLE_COUNT = 6;

/**
 * 生成句子来源文本。
 */
function getQuoteSource(quote: PublicQuote) {
  return quote.workName ? `${quote.authorName} · ${quote.workName}` : quote.authorName;
}

/**
 * 句子展示和 API 调用说明页面。
 */
export function SentencesContent() {
  const [quotes, setQuotes] = useState<PublicQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const featuredQuote = quotes[0];
  const supportingQuotes = useMemo(() => quotes.slice(1, 5), [quotes]);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    const response = await createClientEden().api.v2.quotes.get({
      query: { recommend: "false", count: SENTENCE_SAMPLE_COUNT },
    });
    const result = await unwrapEdenPayload(
      response.data,
      response.error,
      { success: true, data: { quotes: [], count: 0, type: "public" as const } },
    );
    setQuotes(result.data.quotes);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-5">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit">审核句库</Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">句子</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  展示已审核通过的亮点句子。
                </p>
              </div>
            </div>

            <Card className="overflow-hidden rounded-lg">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Sparkles className="size-5" />
                      今日句子
                    </CardTitle>
                    <CardDescription>刷新会重新随机抽取一组已审核句子。</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="w-full cursor-pointer disabled:cursor-not-allowed sm:w-auto"
                    onClick={() => void loadQuotes()}
                  >
                    <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
                    换一组
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading
                  ? (
                      <div className="space-y-5 p-6">
                        <Skeleton className="h-7 w-36" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-5/6" />
                        <div className="space-y-3 pt-4">
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                        </div>
                      </div>
                    )
                  : featuredQuote
                    ? (
                        <div>
                          <div className="p-6 sm:p-8">
                            <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
                              <Quote className="size-4" />
                              <span>{getQuoteSource(featuredQuote)}</span>
                            </div>
                            <blockquote className="text-2xl font-medium leading-10 text-foreground sm:text-3xl sm:leading-12">
                              {featuredQuote.content}
                            </blockquote>
                            {featuredQuote.reason && (
                              <p className="mt-5 max-w-3xl text-sm leading-6 text-muted-foreground">
                                {featuredQuote.reason}
                              </p>
                            )}
                          </div>

                          {supportingQuotes.length > 0 && (
                            <div className="border-t">
                              {supportingQuotes.map(quote => (
                                <div key={quote.id} className="grid gap-3 border-b px-6 py-4 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:px-8">
                                  <div className="text-xs leading-5 text-muted-foreground">{getQuoteSource(quote)}</div>
                                  <p className="text-sm leading-7 text-foreground">{quote.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    : (
                        <div className="p-8 text-sm text-muted-foreground">
                          还没有已审核句子，欢迎先上传你想分享的句子。
                        </div>
                      )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="size-5" />
                  参与句库
                </CardTitle>
                <CardDescription>上传内容审核通过后，才可能进入句库展示和接口返回。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild className="w-full cursor-pointer">
                  <Link href="/sentences/upload">
                    <Upload className="size-4" />
                    打开 /sentences/upload
                  </Link>
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  上传即同意平台在审核通过后将句子用于站内展示、推荐与内容优化。
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code2 className="size-5" />
                  API 调用
                </CardTitle>
                <CardDescription>给外部工具使用的随机句子接口。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge>GET</Badge>
                    <code className="text-xs font-medium text-foreground">/api/v2/quotes</code>
                  </div>
                  <p className="text-xs leading-5">
                    不带 `recommend` 返回所有已审核句子；`recommend=true` 只返回推荐句子。
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full cursor-pointer">
                  <Link href="/api/v2/quotes?recommend=true&count=1" target="_blank">
                    <ExternalLink className="size-4" />
                    查看接口返回
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

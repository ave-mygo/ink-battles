"use client";

import { FileText } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserType } from "@/lib/constants";

export interface UserTierData {
  userType: UserType;
  displayName: string;
  icon: React.ReactNode;
  badgeColor: string;
  limits: {
    perRequest: number | null;
    dailyLimit: number | null;
  };
  advancedModelCalls?: boolean;
  donationAmount?: number;
}

export function LimitModal({ open, onClose, tierData }: {
  open: boolean;
  onClose: () => void;
  tierData: UserTierData;
}) {
  if (!open)
    return null;

  return (
    <div className="bg-black/40 flex items-center inset-0 justify-center fixed z-50">
      <div className="px-8 py-8 rounded-2xl bg-white flex flex-col gap-4 min-w-[320px] shadow-2xl items-center animate-fade-in">
        <div className="text-2xl text-blue-600 font-bold mb-2">已达单次字数上限</div>
        <div className="text-slate-700 mb-2 text-center">
          {tierData.userType === UserType.GUEST
            ? (
                <>
                  游客用户单次最多
                  {" "}
                  {tierData.limits.perRequest?.toLocaleString()}
                  {" "}
                  字
                  <br />
                  每日累计限制
                  {" "}
                  {tierData.limits.dailyLimit?.toLocaleString()}
                  {" "}
                  字
                </>
              )
            : (
                <>
                  {tierData.displayName}
                  单次最多
                  {tierData.limits.perRequest ? `${tierData.limits.perRequest.toLocaleString()} 字` : "无限制"}
                </>
              )}
        </div>
        <div className="text-sm text-slate-600 text-center">
          {tierData.userType === UserType.GUEST
            ? "请尝试分段提交，或先登录以获得更好体验。"
            : tierData.userType === UserType.REGULAR
              ? "请尝试分段提交，或考虑成为会员获得无限制体验。"
              : "请尝试分段提交。"}
        </div>
        {tierData.userType === UserType.GUEST && (
          <a href="/signin" className="text-white font-bold px-6 py-3 rounded-lg bg-blue-600 shadow transition-all duration-200 hover:bg-blue-700">
            去登录
          </a>
        )}
        {tierData.userType === UserType.REGULAR && (
          <a href="/sponsors" className="text-white font-bold px-6 py-3 rounded-lg bg-orange-600 shadow transition-all duration-200 hover:bg-orange-700">
            了解会员
          </a>
        )}
        <button type="button" className="text-slate-600 mt-2" onClick={onClose}>我知道了</button>
      </div>
    </div>
  );
}

export const UsageProgress = React.memo(({ articleLength, perRequestLimit }: {
  articleLength: number;
  perRequestLimit: number | null;
}) => {
  const progressValue = React.useMemo(() => {
    if (!perRequestLimit)
      return 0;
    return Math.min(100, Math.round((articleLength / perRequestLimit) * 100));
  }, [articleLength, perRequestLimit]);

  return (
    <div className="mt-3">
      {perRequestLimit
        ? (
            <>
              <div className="text-[12px] text-slate-600 mb-1 flex justify-between">
                <span>本次输入进度</span>
                <span>
                  {articleLength.toLocaleString()}
                  {" "}
                  /
                  {perRequestLimit.toLocaleString()}
                  {" "}
                  字
                </span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </>
          )
        : (
            <div className="text-[12px] text-slate-600">本次输入：无限制</div>
          )}
    </div>
  );
});
UsageProgress.displayName = "UsageProgress";

export const WordCounter = React.memo(({ articleLength, currentLimit, userType }: {
  articleLength: number;
  currentLimit: number;
  userType: UserType;
}) => {
  const isNearLimit = React.useMemo(() => {
    return currentLimit !== Number.MAX_SAFE_INTEGER && articleLength > currentLimit * 0.8;
  }, [currentLimit, articleLength]);

  const limitDisplay = React.useMemo(() => {
    return currentLimit === Number.MAX_SAFE_INTEGER ? "无限制" : currentLimit.toLocaleString();
  }, [currentLimit]);

  return (
    <div className="text-sm text-slate-500 mt-2 flex items-center justify-between">
      <span>
        字数统计:
        {" "}
        {articleLength}
        {" "}
        /
        {" "}
        {limitDisplay}
        {" "}
        字
      </span>
      {isNearLimit && (
        <span className="text-xs text-amber-600">
          接近限额，建议
          {userType === UserType.GUEST && "登录或"}
          {userType === UserType.REGULAR && "升级会员或"}
          分段提交
        </span>
      )}
    </div>
  );
});
WordCounter.displayName = "WordCounter";

export function WriterAnalysisInputLoading() {
  return (
    <Card className="border-0 bg-white/80 h-full w-full shadow-lg backdrop-blur-sm dark:bg-slate-900/70">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <FileText className="text-blue-600 h-5 w-5 dark:text-blue-400" />
          作品输入
        </CardTitle>
        <CardDescription>请粘贴您要分析的完整作品内容，支持小说、散文、诗歌等各类文体</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 animate-pulse dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-2 rounded bg-gray-200 h-4 w-1/2 dark:bg-slate-700"></div>
          <div className="rounded bg-gray-200 h-3 w-3/4 dark:bg-slate-700"></div>
        </div>
        <div className="rounded bg-gray-100 flex-1 min-h-50 animate-pulse dark:bg-slate-800/70"></div>
      </CardContent>
    </Card>
  );
}

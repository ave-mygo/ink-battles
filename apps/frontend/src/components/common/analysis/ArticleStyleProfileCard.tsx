"use client";

import type { AuthorStyleFeatureProfile } from "@ink-battles/shared/types/common";
import type { ComponentType } from "react";
import { BookOpenText, Brush, MessageSquareQuote, Milestone, PenLine, ScrollText, Sparkles, Tags } from "lucide-react";

interface ArticleStyleProfileCardProps {
  profile?: AuthorStyleFeatureProfile | null;
}

interface StyleProfileItem {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}

/**
 * 展示分析链路为当前作品提取出的结构化文风画像。
 */
export function ArticleStyleProfileCard({ profile }: ArticleStyleProfileCardProps) {
  if (!profile) {
    return null;
  }

  const coreExpression = profile.coreExpression || profile.spiritualCore || profile.emotionalTendency || "";
  const storyContent = profile.storyContent || profile.narrativeMode || "";
  const profileItems: StyleProfileItem[] = [
    { label: "故事内容", value: storyContent, icon: BookOpenText },
    { label: "核心表达", value: coreExpression, icon: MessageSquareQuote },
    { label: "体裁/类型", value: profile.genreType || "", icon: Tags },
    { label: "语言习惯", value: profile.languageHabits.join("、"), icon: PenLine },
    { label: "句式结构", value: profile.sentenceStructures.join("、"), icon: ScrollText },
    { label: "表达节奏", value: profile.expressionRhythm, icon: Milestone },
    { label: "意象偏好", value: profile.imageryPreferences.join("、"), icon: Sparkles },
  ].filter(item => item.value.trim());

  const hasContent = profile.summary || profile.styleLabel || coreExpression || profile.keywords.length > 0 || profileItems.length > 0;
  if (!hasContent) {
    return null;
  }

  return (
    <div>
      <h4 className="text-cyan-700 font-medium mb-2 flex gap-2 items-center dark:text-cyan-300">
        <Brush className="h-4 w-4" />
        当前作品文风画像
      </h4>
      <div className="space-y-3">
        {(profile.styleLabel || profile.summary) && (
          <div className="p-3 border border-cyan-200 rounded-lg bg-cyan-50/70 space-y-1 dark:border-cyan-900 dark:bg-cyan-950/20">
            {profile.styleLabel && (
              <p className="text-sm text-cyan-800 font-semibold dark:text-cyan-200">{profile.styleLabel}</p>
            )}
            {profile.summary && (
              <p className="text-xs text-slate-600 leading-relaxed dark:text-slate-300">{profile.summary}</p>
            )}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {profileItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="p-3 border border-slate-200 rounded-lg bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="text-xs text-slate-500 font-medium mb-1 flex gap-1.5 items-center dark:text-slate-400">
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed dark:text-slate-300">{item.value}</p>
              </div>
            );
          })}
        </div>

        {profile.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.keywords.slice(0, 10).map(keyword => (
              <span
                key={keyword}
                className="text-xs text-cyan-700 px-2 py-1 border border-cyan-200 rounded-md bg-cyan-50 dark:text-cyan-300 dark:border-cyan-900 dark:bg-cyan-950/30"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

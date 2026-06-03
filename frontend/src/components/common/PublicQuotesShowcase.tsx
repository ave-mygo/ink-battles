import type { PublicQuote } from "@ink-battles/shared/types/common";
import { Quote, Sparkles } from "lucide-react";

interface PublicQuotesShowcaseProps {
  quotes: PublicQuote[];
}

/**
 * 首页公开名句展示区，只展示已审核且公开的句子。
 */
export function PublicQuotesShowcase({ quotes }: PublicQuotesShowcaseProps) {
  if (quotes.length === 0)
    return null;

  const quote = quotes[0];

  return (
    <section className="mb-6 rounded-lg border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-3 items-center">
          <span className="shrink-0 rounded-md bg-slate-900 p-1.5 text-white dark:bg-white dark:text-slate-950">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex gap-2 items-center">
              <Quote className="shrink-0 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {quote.content}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {quote.authorName}
              {quote.workName ? ` · ${quote.workName}` : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

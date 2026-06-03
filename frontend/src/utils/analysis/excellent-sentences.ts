"use client";

import type { DatabaseExcellentSentence } from "@ink-battles/shared/types/database";
import { createClientEden } from "@/utils/api/eden-client";
import { normalizeEdenResult } from "@/utils/api/eden-response";

export interface ExcellentSentenceSourceState {
  success: boolean;
  message?: string;
  data?: {
    sentences: DatabaseExcellentSentence[];
    normalizedContents: string[];
  };
}

export interface CollectExcellentSentenceInput {
  content: string;
  sourceArticleId: string;
  authorName?: string;
  workName?: string;
  authorizationGranted: boolean;
}

/**
 * 获取当前文章中已由当前用户收录的句子。
 */
export async function getExcellentSentenceSourceState(sourceArticleId: string) {
  const response = await createClientEden().api.v2["excellent-sentences"].source({ sourceArticleId }).get();
  return normalizeEdenResult<ExcellentSentenceSourceState>(response.data, response.error, "加载优秀句子收录状态失败");
}

/**
 * 提交 AI 选出的优秀句子到收录库。
 */
export async function collectExcellentSentence(input: CollectExcellentSentenceInput) {
  const response = await createClientEden().api.v2["excellent-sentences"].post(input);
  return normalizeEdenResult<{ success: boolean; message?: string }>(response.data, response.error, "提交优秀句子失败");
}

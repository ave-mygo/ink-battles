import type { Metadata } from "next";

import { SentencesContent } from "@/components/layouts/Sentences/SentencesContent";

export const metadata: Metadata = {
  title: "句子与公开 API",
  description: "展示 Ink Battles 公开句库、API 端点和调用示例",
};

/**
 * 公开句库和 API 调用说明页面。
 */
export default function SentencesPage() {
  return <SentencesContent />;
}

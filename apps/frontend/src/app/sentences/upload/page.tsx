import type { Metadata } from "next";

import { CustomSentenceUploadContent } from "@/components/layouts/CustomSentenceUpload/CustomSentenceUploadContent";
import { getCurrentUserInfo } from "@/utils/auth/server";

export const metadata: Metadata = {
  title: "上传亮点句子",
  description: "用户自定义上传亮点句子，提交后进入审核队列",
};

/**
 * 用户自定义上传亮点句子的页面编排入口。
 */
export default async function CustomSentenceUploadPage() {
  const user = await getCurrentUserInfo();
  const defaultAuthorName = user?.nickname || user?.email?.split("@")[0] || "";

  return (
    <CustomSentenceUploadContent
      isAuthenticated={!!user}
      defaultAuthorName={defaultAuthorName}
    />
  );
}

"use client";

import type { GradingModelConfig } from "@ink-battles/shared/types/common/config";
import { useRef } from "react";
import {
  createWriterConfigStore,
  WriterConfigContext,
} from "@/store/writer-config-context";

interface WriterConfigProviderProps {
  initialAvailableGradingModels: GradingModelConfig[];
  children: React.ReactNode;
}

/**
 * 承接服务端注入的首页模型配置，避免继续向深层组件透传页面级 props。
 */
export function WriterConfigProvider({
  initialAvailableGradingModels,
  children,
}: WriterConfigProviderProps) {
  const storeRef = useRef<ReturnType<typeof createWriterConfigStore> | null>(null);

  if (!storeRef.current) {
    storeRef.current = createWriterConfigStore({
      availableGradingModels: initialAvailableGradingModels,
    });
  }

  return (
    <WriterConfigContext value={storeRef.current}>
      {children}
    </WriterConfigContext>
  );
}

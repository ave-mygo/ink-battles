"use client";

import type { GradingModelConfig } from "@ink-battles/shared/types/common/config";
import { createContext, useContext, useRef } from "react";
import { createStore, useStore } from "zustand";

interface WriterConfigState {
  availableGradingModels: GradingModelConfig[];
}

interface WriterConfigActions {
  setAvailableGradingModels: (models: GradingModelConfig[]) => void;
}

type WriterConfigStore = WriterConfigState & WriterConfigActions;

const createWriterConfigStore = (initialState: WriterConfigState) =>
  createStore<WriterConfigStore>()(set => ({
    ...initialState,
    setAvailableGradingModels: availableGradingModels => set({ availableGradingModels }),
  }));

const WriterConfigContext = createContext<ReturnType<typeof createWriterConfigStore> | null>(null);

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
    <WriterConfigContext.Provider value={storeRef.current}>
      {children}
    </WriterConfigContext.Provider>
  );
}

const useWriterConfigStore = <T,>(selector: (state: WriterConfigStore) => T) => {
  const store = useContext(WriterConfigContext);
  if (!store) {
    throw new Error("useWriterConfigStore 必须在 WriterConfigProvider 内使用");
  }

  return useStore(store, selector);
};

export const useAvailableGradingModels = () =>
  useWriterConfigStore(state => state.availableGradingModels);

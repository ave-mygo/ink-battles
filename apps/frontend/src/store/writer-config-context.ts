"use client";

import type { GradingModelConfig } from "@ink-battles/shared/types/common/config";
import type { PublicUploadLimits, PublicValidatorModelConfig } from "@ink-battles/shared/types/common/public-config";
import { createContext, use } from "react";
import { createStore, useStore } from "zustand";

interface WriterConfigState {
  availableGradingModels: GradingModelConfig[];
  uploadLimits?: PublicUploadLimits;
  validatorModels: PublicValidatorModelConfig[];
}

interface WriterConfigActions {
  setAvailableGradingModels: (models: GradingModelConfig[]) => void;
}

export type WriterConfigStore = WriterConfigState & WriterConfigActions;

export const createWriterConfigStore = (initialState: WriterConfigState) =>
  createStore<WriterConfigStore>()(set => ({
    ...initialState,
    setAvailableGradingModels: availableGradingModels => set({ availableGradingModels }),
  }));

export const WriterConfigContext = createContext<ReturnType<typeof createWriterConfigStore> | null>(null);

const useWriterConfigStore = <T>(selector: (state: WriterConfigStore) => T) => {
  const store = use(WriterConfigContext);
  if (!store) {
    throw new Error("useWriterConfigStore 必须在 WriterConfigProvider 内使用");
  }

  return useStore(store, selector);
};

export const useAvailableGradingModels = () =>
  useWriterConfigStore(state => state.availableGradingModels);

export const useWriterUploadLimits = () =>
  useWriterConfigStore(state => state.uploadLimits);

export const useValidatorModels = () =>
  useWriterConfigStore(state => state.validatorModels);

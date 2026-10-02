"use client";

import type { BillingSummaryState } from "@ink-battles/shared/types/common/billing";
import { createContext, use, useEffect } from "react";
import { BILLING_BALANCE_UPDATED_EVENT } from "@/utils/billing/client";

export interface BillingContextValue {
  billingSummary: BillingSummaryState | null;
  isLoading: boolean;
  errorMessage: string | null;
  refreshBilling: () => Promise<BillingSummaryState | undefined>;
}

export const BillingContext = createContext<BillingContextValue | null>(null);

export const useBillingContext = () => {
  const context = use(BillingContext);
  if (!context) {
    throw new Error("useBillingContext 必须在 BillingProvider 内使用");
  }

  return context;
};

export const useBillingAutoRefresh = (refreshBilling: () => Promise<BillingSummaryState | undefined>) => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBillingUpdated = () => {
      void refreshBilling();
    };

    window.addEventListener(BILLING_BALANCE_UPDATED_EVENT, handleBillingUpdated);

    return () => {
      window.removeEventListener(BILLING_BALANCE_UPDATED_EVENT, handleBillingUpdated);
    };
  }, [refreshBilling]);
};

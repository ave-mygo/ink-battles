"use client";

import type { BillingSummaryState } from "@ink-battles/shared/types/common/billing";
import useSWR from "swr";
import { BillingContext } from "@/components/dashboard/BillingContext";
import { getBillingInfo } from "@/utils/billing/client";

interface BillingProviderProps {
  initialState: BillingSummaryState | null;
  initialErrorMessage?: string | null;
  children: React.ReactNode;
}

const BILLING_SUMMARY_KEY = "dashboard-billing-summary";

/**
 * 统一承接计费页面的服务端首屏数据，并用 SWR 接管后续刷新。
 */
export function BillingProvider({
  initialState,
  initialErrorMessage = null,
  children,
}: BillingProviderProps) {
  const { data, error, isLoading, mutate } = useSWR(
    BILLING_SUMMARY_KEY,
    async () => {
      const result = await getBillingInfo();
      if (!result.success || !result.data) {
        throw new Error(result.message || "加载计费信息失败");
      }
      return result.data;
    },
    {
      fallbackData: initialState ?? undefined,
      revalidateOnMount: false,
      revalidateOnFocus: false,
    },
  );

  const refreshBilling = async () => {
    const nextState = await mutate();
    return nextState;
  };

  return (
    <BillingContext
      value={{
        billingSummary: data ?? initialState,
        isLoading: !initialState && isLoading,
        errorMessage: error instanceof Error ? error.message : initialErrorMessage,
        refreshBilling,
      }}
    >
      {children}
    </BillingContext>
  );
}

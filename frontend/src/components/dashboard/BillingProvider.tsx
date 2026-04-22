"use client";

import type { BillingSummaryState } from "@ink-battles/shared/types/common/billing";
import { createContext, useContext } from "react";
import { useEffect } from "react";
import useSWR from "swr";
import { BILLING_BALANCE_UPDATED_EVENT, getBillingInfo } from "@/utils/billing/client";

interface BillingContextValue {
	billingSummary: BillingSummaryState | null;
	isLoading: boolean;
	errorMessage: string | null;
	refreshBilling: () => Promise<BillingSummaryState | undefined>;
}

const BillingContext = createContext<BillingContextValue | null>(null);

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
		<BillingContext.Provider
			value={{
				billingSummary: data ?? initialState,
				isLoading: !initialState && isLoading,
				errorMessage: error instanceof Error ? error.message : initialErrorMessage,
				refreshBilling,
			}}
		>
			{children}
		</BillingContext.Provider>
	);
}

export const useBillingContext = () => {
	const context = useContext(BillingContext);
	if (!context) {
		throw new Error("useBillingContext 必须在 BillingProvider 内使用");
	}

	return context;
};

/**
 * 供站内其他模块在余额发生变化时触发静默重拉。
 */
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

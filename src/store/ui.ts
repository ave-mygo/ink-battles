"use client";

import { create } from "zustand";

interface UiState {
	dashboardSidebarOpen: boolean;
	openDashboardSidebar: () => void;
	closeDashboardSidebar: () => void;
	toggleDashboardSidebar: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
	dashboardSidebarOpen: false,
	openDashboardSidebar: () => set({ dashboardSidebarOpen: true }),
	closeDashboardSidebar: () => set({ dashboardSidebarOpen: false }),
	toggleDashboardSidebar: () => set({ dashboardSidebarOpen: !get().dashboardSidebarOpen }),
}));

export const useDashboardSidebarOpen = () => useUiStore(s => s.dashboardSidebarOpen);
export const useDashboardSidebarActions = () => {
	const open = useUiStore(s => s.openDashboardSidebar);
	const close = useUiStore(s => s.closeDashboardSidebar);
	const toggle = useUiStore(s => s.toggleDashboardSidebar);
	return { open, close, toggle };
};

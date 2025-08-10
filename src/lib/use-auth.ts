"use client";

import { useCallback, useEffect, useState } from "react";

export interface AuthState {
	email: string | null;
	isLoggedIn: boolean;
}

export function useAuth() {
	const [user, setUser] = useState<AuthState | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch("/api/auth/me", { cache: "no-store" });
			if (res.status === 401) {
				setUser({ email: null, isLoggedIn: false });
				return;
			}
			const data = await res.json();
			setUser({ email: data.email ?? null, isLoggedIn: !!data.isLoggedIn });
		} catch (e) {
			console.error(e);
			setError("无法获取登录状态");
			setUser({ email: null, isLoggedIn: false });
		} finally {
			setLoading(false);
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			await fetch("/api/auth/logout", { method: "POST" });
		} catch { }
		// 刷新到首页或当前页
		if (typeof window !== "undefined") {
			window.location.reload();
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { user, loading, error, refresh, logout } as const;
}

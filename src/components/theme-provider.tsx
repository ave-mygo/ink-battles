"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * 主题提供者组件
 * 基于 next-themes 实现主题管理功能
 *
 * 功能特性：
 * - 支持 light、dark、system 三种主题模式
 * - 自动检测系统主题偏好
 * - 主题状态持久化到 localStorage
 * - 避免服务端渲染时的主题闪烁
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "@/components/layouts/Dashboard/DashboardLayoutClient";
import { getCurrentUserInfo } from "@/utils/auth/server";

/**
 * 仪表盘页面元数据
 */
export const metadata: Metadata = {
	title: "仪表盘",
	description: "管理您的账号信息和设置",
};

/**
 * 仪表盘布局组件
 * 包含顶部导航栏和可折叠侧边栏
 */
export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// 获取用户信息
	const user = await getCurrentUserInfo();

	// 未登录用户重定向到登录页
	if (!user) {
		redirect("/signin");
	}

	return <DashboardLayoutClient user={user}>{children}</DashboardLayoutClient>;
}

import { redirect } from "next/navigation";

/**
 * 仪表盘根页面
 * 重定向到用户信息页面
 */
export default function DashboardPage() {
	redirect("/dashboard/profile");
}

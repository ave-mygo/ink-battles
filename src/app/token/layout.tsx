import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "API Token管理 - 作家战力分析系统",
		description: "管理您的API Token，了解API使用规则与配额限制。集成文本分析API，为您的应用添加专业评分功能。",
	};
}

export default function TokenLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}

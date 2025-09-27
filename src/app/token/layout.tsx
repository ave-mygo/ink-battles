import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "Token管理",
		description: "API Token功能说明和当前系统使用规则",
	};
}

export default function TokenLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}

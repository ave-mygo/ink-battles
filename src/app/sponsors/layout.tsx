import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: "赞助支持",
		description: "感谢所有支持项目发展的赞助者，查看赞助者名单和支持方式",
	};
}

export default function SponsorsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}
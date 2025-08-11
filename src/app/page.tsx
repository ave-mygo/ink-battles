import type { Metadata } from "next";
import WriterAnalysisSystem from "@/components/layouts";
import NoticeBar from "@/components/ui/notice-bar";

export async function generateMetadata(): Promise<Metadata> {
	return {
		title: {
			template: "%s | 作家战力分析系统",
			default: "作家战力分析系统",
		},
		description: "基于AI技术的专业文本分析工具，为您的创作提供深度洞察",
	};
}

export default async function Home() {
	// 服务端获取公告内容
	const res = await fetch("https://mx.tnxg.top/api/v2/snippets/data/ink-battles", { cache: "no-store" });
	const data = await res.json();
	const message = data.message || "";
	const link = data.link || "https://afdian.com/a/tianxiang?tab=feed";
	return (
		<>
			<NoticeBar message={message} link={link} />
			<WriterAnalysisSystem />
		</>
	);
}

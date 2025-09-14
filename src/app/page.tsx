import type { Metadata } from "next";
import { NoticeBar } from "@/components/common/notice-bar";
import WriterAnalysisSystem from "@/components/layouts";

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
	const message = "";
	const link = "https://afdian.com/a/tianxiang?tab=feed";

	return (
		<>
			<NoticeBar message={message} link={link} />
			<WriterAnalysisSystem />
		</>
	);
}

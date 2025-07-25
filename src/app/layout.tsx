import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import NoticeBar from "@/components/ui/notice-bar";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const notoSans = Noto_Sans_SC({
	variable: "--font-sans",
	subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "作家战力分析系统",
	description: "基于AI技术的专业文本分析工具，为您的创作提供深度洞察",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// 服务端获取公告内容
	const res = await fetch("https://mx.tnxg.top/api/v2/snippets/data/ink-battles", { cache: "no-store" });
	const data = await res.json();
	const message = data.message || "";
	const link = data.link || "https://afdian.com/a/tianxiang?tab=feed";
	return (
		<html lang="zh-CN">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<script defer src="https://umami.tnxg.top/script.js" data-website-id="d9facdd3-cf1c-40ea-b348-c7324cb86de7"></script>
				<script type="text/javascript">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "shdrl9z58x");`}</script>
			</head>
			<body
				className={`${notoSans.variable} ${jetBrainsMono.variable} antialiased`}
			>
				<NoticeBar message={message} link={link} />
				{children}
				<Toaster />
			</body>
		</html>
	);
}

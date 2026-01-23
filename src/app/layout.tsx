import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";

import { AppHeader } from "@/components/common/header/AppHeader";
import { ThemeProvider } from "@/components/common/theme/provider";
import { Toaster } from "@/components/ui/sonner";
import { getConfig } from "@/config";

import "./globals.css";

const notoSans = Noto_Sans_SC({
	variable: "--font-sans",
	subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
});

const config = getConfig();

export const metadata: Metadata = {
	metadataBase: new URL(config.app.base_url),
	title: {
		template: "%s | 作家战力分析系统",
		default: "作家战力分析系统 - 基于AI的专业文本分析工具",
	},
	description: "作家战力分析系统是一款基于先进AI技术的文本分析工具，为创作者提供多维度写作评估、内容质量打分、风格分析等功能。支持小说、文章、剧本等多种文体，帮助作家提升创作水平。",
	keywords: [
		"作家战力",
		"文本分析",
		"AI写作",
		"内容评估",
		"写作工具",
		"创作辅助",
		"文章分析",
		"小说分析",
		"写作质量",
		"文本评分",
	],
	authors: [{ name: "Ink Battles" }],
	creator: "Ink Battles",
	publisher: "Ink Battles",
	icons: {
		icon: "/favicon.png",
		apple: "/favicon.png",
	},
	robots: {
		index: true,
		follow: true,
		nocache: false,
		googleBot: {
			"index": true,
			"follow": true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	openGraph: {
		type: "website",
		locale: "zh_CN",
		url: config.app.base_url,
		siteName: "作家战力分析系统",
		title: "作家战力分析系统 - 基于AI的专业文本分析工具",
		description: "基于先进AI技术的文本分析工具，为创作者提供多维度写作评估、内容质量打分、风格分析等功能",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: "作家战力分析系统",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "作家战力分析系统 - 基于AI的专业文本分析工具",
		description: "基于先进AI技术的文本分析工具，为创作者提供多维度写作评估",
		images: ["/opengraph-image"],
	},
	verification: {
		// 添加搜索引擎验证码（需要时填写）
		// google: "your-google-verification-code",
		// baidu: "your-baidu-verification-code",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="zh-CN" suppressHydrationWarning>
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<script defer src="https://umami.tnxg.top/script.js" data-website-id="d9facdd3-cf1c-40ea-b348-c7324cb86de7"></script>
				<script type="text/javascript">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "shdrl9z58x");`}</script>
			</head>
			<body
				className={`${notoSans.variable}  ${jetBrainsMono.variable} from-slate-50 to-slate-100 bg-linear-to-br dark:from-slate-900 dark:to-slate-800`}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<AppHeader />
					{children}
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}

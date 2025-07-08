import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="zh-CN">
			<body
				className={`${notoSans.variable} ${jetBrainsMono.variable} antialiased`}
			>
				{children}
				<Toaster />
			</body>
		</html>
	);
}

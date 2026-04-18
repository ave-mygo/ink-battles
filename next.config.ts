import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Docker 部署需要 standalone 输出模式
	output: "standalone",
	allowedDevOrigins: [
		"ink-battles.couqie.moe",
		"dev-ink-battles.couqie.moe",
		"localhost:3000",
	],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "pic1.afdiancdn.com",
			},
		],
	},
};

export default nextConfig;

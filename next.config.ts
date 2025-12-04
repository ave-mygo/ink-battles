import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

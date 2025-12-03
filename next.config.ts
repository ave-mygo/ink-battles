import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: [
		"dev-ink-battles.rikki.top",
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

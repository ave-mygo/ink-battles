import type { NextConfig } from "next";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  // Docker 部署需要 standalone 输出模式
  output: "standalone",
  outputFileTracingRoot: repositoryRoot,
  transpilePackages: ["@ink-battles/shared"],
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

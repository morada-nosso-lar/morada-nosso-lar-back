import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "pg", "reflect-metadata", "@neondatabase/serverless", "ws"],
  experimental: {
    // Next 16 removed swcMinify. Keep server class names so TypeORM
    // relations are not collapsed to a single letter such as "d".
    serverMinification: false,
    turbopackMinify: false,
  },
};

export default nextConfig;
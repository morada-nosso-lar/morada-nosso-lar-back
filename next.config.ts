import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "pg", "reflect-metadata", "@neondatabase/serverless", "ws"],
};

export default nextConfig;

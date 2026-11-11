import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["better-sqlite3"],
  transpilePackages: ["@founder-os/studio"],
};

export default nextConfig;

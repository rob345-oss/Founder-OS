import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["better-sqlite3"],
  transpilePackages: ["@founder-os/studio"],
  async redirects() {
    return [
      { source: "/CRM", destination: "/crm", permanent: false },
      { source: "/CRM/:path*", destination: "/crm/:path*", permanent: false },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

/**
 * When marketing (and other Founder OS routes) are served via a host-level rewrite
 * (e.g. staging.titaniumguardian.com → founder-os-web), relative `/_next/static/*`
 * URLs would resolve against the outer host and load the wrong app's CSS/JS.
 *
 * Set FOUNDER_OS_ASSET_PREFIX=/founder-os-assets on Vercel for founder-os-web, and
 * proxy that prefix on the outer host to this deployment (see .tg-ref/frontend/vercel.json).
 */
function resolveFounderOsAssetPrefix(): string | undefined {
  const raw =
    process.env.FOUNDER_OS_ASSET_PREFIX?.trim() || process.env.FOUNDER_OS_ASSET_ORIGIN?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

const assetPrefix = resolveFounderOsAssetPrefix();

const nextConfig: NextConfig = {
  ...(assetPrefix ? { assetPrefix } : {}),
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

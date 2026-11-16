export const TG_PRODUCTION_APP_ORIGIN = "https://titaniumguardian.com";
export const TG_STAGING_APP_ORIGIN = "https://staging.titaniumguardian.com";

export type TgAppTier = "production" | "staging" | "local";

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

function tierFromHostname(hostname: string): TgAppTier | null {
  const host = hostname.toLowerCase();
  if (host === "titaniumguardian.com" || host === "www.titaniumguardian.com") return "production";
  if (host === "staging.titaniumguardian.com") return "staging";
  return null;
}

export function originForTier(tier: TgAppTier): string {
  if (tier === "production") return TG_PRODUCTION_APP_ORIGIN;
  if (tier === "staging") return TG_STAGING_APP_ORIGIN;
  return "http://localhost:3000";
}

/** Resolve the public Titanium Guardian site origin used for /login redirects (never loopback on Vercel). */
export function resolveTgAppOrigin(clientHostname?: string): string {
  const explicit = readEnv("NEXT_PUBLIC_TG_APP_ORIGIN");
  if (explicit) return explicit.replace(/\/$/, "");

  const tierEnv = readEnv("NEXT_PUBLIC_TG_APP_ENV")?.toLowerCase();
  if (tierEnv === "production" || tierEnv === "staging" || tierEnv === "local") {
    if (tierEnv === "local" && typeof window !== "undefined") {
      return window.location.origin.replace(/\/$/, "");
    }
    return originForTier(tierEnv);
  }

  if (readEnv("CRM_TG_API_ENV") === "production") {
    return TG_PRODUCTION_APP_ORIGIN;
  }

  if (clientHostname) {
    const fromHost = tierFromHostname(clientHostname);
    if (fromHost) return originForTier(fromHost);
  }

  if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
    return TG_STAGING_APP_ORIGIN;
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return originForTier("local");
}
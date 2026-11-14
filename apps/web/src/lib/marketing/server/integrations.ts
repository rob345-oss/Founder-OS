import { getMarketingConfig } from "../config";
import type { IntegrationCardState, MarketingIntegrationStatus } from "../types";
import { collectMarketingSocialIntegrations } from "./social-platforms";

function mapSocialState(
  state: string,
): IntegrationCardState {
  if (state === "connected") return "connected";
  if (state === "needs_configuration" || state === "not_implemented") return "setup_required";
  return "unsupported";
}

export function collectMarketingIntegrations(): MarketingIntegrationStatus[] {
  const cfg = getMarketingConfig();
  const social = collectMarketingSocialIntegrations();

  const items: MarketingIntegrationStatus[] = [
    {
      id: "tg_waitlist",
      label: "Titanium Guardian waitlist",
      state: "connected",
      detail: "Synced via CRM waitlist bridge (authoritative TG leads API).",
    },
    {
      id: "tg_crm",
      label: "Titanium Guardian CRM",
      state: cfg.databaseUrl || process.env.VERCEL !== "1" ? "connected" : "setup_required",
      detail: cfg.databaseUrl
        ? "CRM store available for marketing analytics aggregates."
        : "Set CRM_DATABASE_URL on staging for cloud persistence.",
    },
    {
      id: "website_analytics",
      label: "Website analytics (GA4)",
      state: cfg.googleAnalyticsPropertyId && cfg.googleAnalyticsCredentialsJson ? "setup_required" : "setup_required",
      detail:
        cfg.googleAnalyticsPropertyId && cfg.googleAnalyticsCredentialsJson
          ? "Credentials detected — API read path not wired yet."
          : "Connect analytics to activate visitor metrics. Set GA4_PROPERTY_ID and server credentials.",
    },
    {
      id: "google_search_console",
      label: "Google Search Console",
      state: cfg.googleSearchConsoleSite ? "setup_required" : "setup_required",
      detail: cfg.googleSearchConsoleSite
        ? "Site configured — Search Console API not wired yet."
        : "Optional search insights — configure MARKETING_GSC_SITE_URL.",
    },
    ...social.map((s) => ({
      id: `social_${s.platform}`,
      label: s.label,
      state: mapSocialState(s.state),
      detail: s.setupHint,
    })),
  ];

  return items;
}

export function integrationsSummary(items: MarketingIntegrationStatus[]): { connected: number; total: number } {
  return {
    connected: items.filter((i) => i.state === "connected").length,
    total: items.length,
  };
}

export function isWebsiteAnalyticsLive(): boolean {
  void getMarketingConfig();
  return false; // No live GA pull yet — honest default
}

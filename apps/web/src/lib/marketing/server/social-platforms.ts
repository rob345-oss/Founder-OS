/** Social platform setup cards for Marketing integrations (server-only env probes). */

export type MarketingSocialPlatformId = "instagram" | "facebook" | "linkedin";

export type MarketingSocialIntegrationPublic = {
  platform: MarketingSocialPlatformId;
  label: string;
  state: "connected" | "needs_configuration" | "not_implemented";
  accountName: string | null;
  setupHint: string;
};

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

function platformSetup(
  platform: MarketingSocialPlatformId,
  label: string,
  appIdEnv: string,
  secretEnv: string,
  extra?: string,
): MarketingSocialIntegrationPublic {
  const appId = readEnv(appIdEnv);
  const secret = readEnv(secretEnv);
  const hasCreds = Boolean(appId && secret);
  let state: MarketingSocialIntegrationPublic["state"] = "not_implemented";
  let setupHint =
    "OAuth and publishing APIs are not connected. Configure developer app credentials server-side and complete platform review.";

  if (appId && !secret) {
    state = "needs_configuration";
    setupHint = `Set ${secretEnv} on the server (never in the browser).`;
  } else if (!appId && secret) {
    state = "needs_configuration";
    setupHint = `Set ${appIdEnv} on the server.`;
  } else if (hasCreds) {
    state = "needs_configuration";
    setupHint =
      "App credentials detected. Complete OAuth authorization flow and grant publishing scopes.";
  }

  if (extra) setupHint = `${setupHint} ${extra}`;

  return {
    platform,
    label,
    state,
    accountName: null,
    setupHint,
  };
}

export function collectMarketingSocialIntegrations(): MarketingSocialIntegrationPublic[] {
  return [
    platformSetup(
      "instagram",
      "Instagram",
      "META_APP_ID",
      "META_APP_SECRET",
      "Requires Meta app with Instagram Graph permissions.",
    ),
    platformSetup(
      "facebook",
      "Facebook",
      "META_APP_ID",
      "META_APP_SECRET",
      "Page publishing uses Meta Graph API with page access tokens.",
    ),
    platformSetup(
      "linkedin",
      "LinkedIn",
      "LINKEDIN_CLIENT_ID",
      "LINKEDIN_CLIENT_SECRET",
      "Marketing APIs require LinkedIn developer app approval.",
    ),
  ];
}

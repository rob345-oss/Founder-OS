import { getCrmConfig, isHostedCrmDeployment, resolveCrmDatabaseUrl } from "@/lib/crm/config";

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

export function resolveMarketingDatabaseUrl(): string | undefined {
  const explicit = readEnv("MARKETING_DATABASE_URL");
  if (explicit) return explicit;
  const crmUrl = resolveCrmDatabaseUrl();
  if (crmUrl) return crmUrl;
  if (isHostedCrmDeployment()) return undefined;
  return readEnv("DATABASE_URL");
}

export function getMarketingConfig() {
  const crm = getCrmConfig();
  return {
    databaseUrl: resolveMarketingDatabaseUrl(),
    dataDir: readEnv("MARKETING_DATA_DIR") ?? crm.dataDir,
    googleAnalyticsPropertyId: readEnv("MARKETING_GA4_PROPERTY_ID") ?? readEnv("GA4_PROPERTY_ID"),
    googleAnalyticsCredentialsJson: readEnv("MARKETING_GA4_CREDENTIALS_JSON"),
    googleSearchConsoleSite: readEnv("MARKETING_GSC_SITE_URL"),
    timezone: readEnv("MARKETING_BUSINESS_TIMEZONE") ?? "Europe/Madrid",
  };
}

export function assertMarketingPersistenceForHost(): void {
  if (isHostedCrmDeployment() && !getMarketingConfig().databaseUrl) {
    throw new Error(
      "MARKETING_DATABASE_URL or CRM_DATABASE_URL is required on hosted Marketing deployments (SQLite is not permitted).",
    );
  }
}
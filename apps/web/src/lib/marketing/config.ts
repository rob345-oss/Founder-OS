import { getCrmConfig } from "@/lib/crm/config";

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

export function getMarketingConfig() {
  const crm = getCrmConfig();
  return {
    databaseUrl:
      readEnv("MARKETING_DATABASE_URL") ?? crm.databaseUrl ?? readEnv("DATABASE_URL"),
    dataDir: readEnv("MARKETING_DATA_DIR") ?? crm.dataDir,
    googleAnalyticsPropertyId: readEnv("MARKETING_GA4_PROPERTY_ID") ?? readEnv("GA4_PROPERTY_ID"),
    googleAnalyticsCredentialsJson: readEnv("MARKETING_GA4_CREDENTIALS_JSON"),
    googleSearchConsoleSite: readEnv("MARKETING_GSC_SITE_URL"),
    timezone: readEnv("MARKETING_BUSINESS_TIMEZONE") ?? "Europe/Madrid",
  };
}

import { TG_DEFAULT_PRODUCTION_API, TG_DEFAULT_STAGING_API } from "@/lib/infrastructure/tg-verified";

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

export type CrmConfig = {
  databaseUrl: string | undefined;
  dataDir: string | undefined;
  tgApiBaseUrl: string;
  backendTimeoutMs: number;
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  /** Server-only bearer for automated lead sync (admin-capable TG token). */
  tgSyncBearer: string | undefined;
  /** Protects POST /api/crm/cron/sync-waitlist */
  cronSecret: string | undefined;
  /** HMAC secret for generic email event webhooks (Twilio Email forwarder). */
  emailWebhookSecret: string | undefined;
  /** SendGrid/Twilio Email Event Webhook ECDSA public key (PEM). */
  sendgridWebhookPublicKey: string | undefined;
  /** When false, open/click events are ignored (privacy). */
  emailTrackEngagement: boolean;
  syncIntervalMinutes: number;
};

export function getCrmConfig(): CrmConfig {
  const timeoutRaw = Number(readEnv("CRM_HTTP_TIMEOUT_MS") ?? readEnv("INFRASTRUCTURE_HTTP_TIMEOUT_MS") ?? "15000");
  const backendTimeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 15_000;

  const useProd = readEnv("CRM_TG_API_ENV") === "production";
  const tgApiBaseUrl =
    readEnv("CRM_TG_API_BASE_URL") ??
    (useProd
      ? readEnv("TITANIUM_GUARDIAN_PRODUCTION_API_URL") ?? TG_DEFAULT_PRODUCTION_API
      : readEnv("TITANIUM_GUARDIAN_STAGING_API_URL") ?? TG_DEFAULT_STAGING_API);

  const intervalRaw = Number(readEnv("CRM_WAITLIST_SYNC_INTERVAL_MINUTES") ?? "5");
  const syncIntervalMinutes = Number.isFinite(intervalRaw) && intervalRaw > 0 ? intervalRaw : 5;

  return {
    databaseUrl:
      readEnv("CRM_DATABASE_URL") ??
      readEnv("FOUNDER_OS_CRM_DATABASE_URL") ??
      readEnv("DATABASE_URL"),
    dataDir: readEnv("FOUNDER_OS_CRM_DATA_DIR"),
    tgApiBaseUrl: tgApiBaseUrl.replace(/\/$/, ""),
    backendTimeoutMs,
    supabaseUrl: readEnv("SUPABASE_URL") ?? readEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: readEnv("SUPABASE_ANON_KEY") ?? readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    tgSyncBearer:
      readEnv("CRM_TG_SYNC_BEARER_TOKEN") ?? readEnv("TITANIUM_GUARDIAN_STAGING_BEARER_TOKEN"),
    cronSecret: readEnv("CRM_CRON_SECRET") ?? readEnv("CRON_SECRET"),
    emailWebhookSecret: readEnv("CRM_EMAIL_WEBHOOK_SECRET"),
    sendgridWebhookPublicKey: readEnv("CRM_SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY"),
    emailTrackEngagement: readEnv("CRM_EMAIL_TRACK_ENGAGEMENT") === "true",
    syncIntervalMinutes,
  };
}

/** Staging/production hosts must not rely on loopback SQLite for CRM PII. */
export function assertCrmPersistenceForHost(): void {
  if (process.env.VERCEL === "1" && !getCrmConfig().databaseUrl) {
    throw new Error("CRM_DATABASE_URL is required on Vercel (SQLite is not permitted for CRM).");
  }
}

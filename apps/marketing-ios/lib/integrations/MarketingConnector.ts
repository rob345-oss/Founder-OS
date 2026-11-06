import type { IntegrationProviderId } from '@/lib/domain/types';

/** Future: OAuth handoff, token lifecycle — not implemented in v1 */
export interface AuthResult {
  status: 'not_implemented';
}

/** Account identifier in provider namespace */
export interface ExternalAccountRef {
  providerId: IntegrationProviderId;
  externalAccountId: string;
}

/** What a connector can report */
export interface MetricCapability {
  kpiKey: string;
  granularity: 'daily' | 'weekly' | 'monthly';
}

/** Normalized batch from provider */
export interface HistoricalMetricPoint {
  accountRef: ExternalAccountRef;
  kpiKey: string;
  value: number;
  periodStart: string;
  periodEnd: string;
  measurementType: 'actual' | 'calculated';
  rawMetricId?: string;
}

export interface SyncStatus {
  lastSyncAt: string | null;
  inFlight: boolean;
  errorMessage: string | null;
}

export interface RateLimitState {
  retryAfterMs: number | null;
}

/** Full connector contract (Phase 7 architecture only) */
export interface MarketingConnector {
  readonly providerId: IntegrationProviderId;

  authenticate(): Promise<AuthResult>;
  discoverAccounts(): Promise<ExternalAccountRef[]>;
  getCapabilities(account: ExternalAccountRef): Promise<MetricCapability[]>;
  fetchHistorical(
    account: ExternalAccountRef,
    fromISO: string,
    toISO: string
  ): Promise<HistoricalMetricPoint[]>;
  sync(account: ExternalAccountRef): Promise<SyncStatus>;
  handleRateLimit(): RateLimitState;
  reportError(): { code: string; message: string } | null;
}

/** Registry stub — real implementations added when OAuth/backend exist */
export const connectorRegistry: Record<IntegrationProviderId, null> = {
  instagram_meta: null,
  linkedin: null,
  tiktok: null,
  youtube_google: null,
  facebook: null,
  x: null,
  google_analytics: null,
  other: null,
};

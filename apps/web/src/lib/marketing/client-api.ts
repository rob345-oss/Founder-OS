import type {
  MarketingCampaign,
  MarketingContentItem,
  MarketingGoal,
  MarketingIntegrationStatus,
  MarketingOverviewResponse,
  MarketingSettings,
} from "./types";

function headers(token: string | null): HeadersInit {
  const h: HeadersInit = { Accept: "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as { error?: string } & T;
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export type MarketingSessionInfo = {
  authorized: boolean;
  email?: string | null;
  role?: string | null;
};

export async function fetchMarketingSession(token: string | null): Promise<MarketingSessionInfo> {
  if (!token) return { authorized: false };
  const { fetchMarketingSessionDeduped } = await import("./session-fetch");
  return fetchMarketingSessionDeduped(token);
}

export async function fetchMarketingOverview(
  token: string | null,
  query: { preset?: string; start?: string; end?: string },
): Promise<MarketingOverviewResponse> {
  const params = new URLSearchParams();
  if (query.preset) params.set("preset", query.preset);
  if (query.start) params.set("start", query.start);
  if (query.end) params.set("end", query.end);
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/marketing/overview${q}`, { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export async function fetchMarketingIntegrations(token: string | null): Promise<MarketingIntegrationStatus[]> {
  const res = await fetch("/api/marketing/integrations", { headers: headers(token), cache: "no-store" });
  const body = await parseJson<{ items: MarketingIntegrationStatus[] }>(res);
  return body.items;
}

export async function fetchMarketingCampaigns(token: string | null): Promise<MarketingCampaign[]> {
  const res = await fetch("/api/marketing/campaigns", { headers: headers(token), cache: "no-store" });
  const body = await parseJson<{ items: MarketingCampaign[] }>(res);
  return body.items;
}

export async function createMarketingCampaign(
  token: string | null,
  body: Record<string, unknown>,
): Promise<MarketingCampaign> {
  const res = await fetch("/api/marketing/campaigns", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchMarketingGoals(token: string | null): Promise<MarketingGoal[]> {
  const res = await fetch("/api/marketing/goals", { headers: headers(token), cache: "no-store" });
  const body = await parseJson<{ items: MarketingGoal[] }>(res);
  return body.items;
}

export async function createMarketingGoal(token: string | null, body: Record<string, unknown>): Promise<MarketingGoal> {
  const res = await fetch("/api/marketing/goals", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchMarketingContent(token: string | null): Promise<MarketingContentItem[]> {
  const res = await fetch("/api/marketing/content", { headers: headers(token), cache: "no-store" });
  const body = await parseJson<{ items: MarketingContentItem[] }>(res);
  return body.items;
}

export async function createMarketingContent(
  token: string | null,
  body: Record<string, unknown>,
): Promise<MarketingContentItem> {
  const res = await fetch("/api/marketing/content", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export type MarketingSettingsPayload = MarketingSettings & {
  integrationHealth: { connected: number; total: number };
  integrations: import("./types").MarketingIntegrationStatus[];
};

export async function fetchMarketingSettings(token: string | null): Promise<MarketingSettingsPayload> {
  const res = await fetch("/api/marketing/settings", { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

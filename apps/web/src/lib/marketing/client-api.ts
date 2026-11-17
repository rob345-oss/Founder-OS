import type {
  MarketingCampaign,
  MarketingContentItem,
  MarketingGoal,
  MarketingIntegrationStatus,
  MarketingOverviewResponse,
  MarketingSettings,
} from "./types";
import type { SocialMediaAsset, SocialMediaAssetType } from "./social-media-types";
import type { SocialAccount, SocialOverviewResponse, SocialPlatformId, SocialPostWithMetrics } from "./social-types";

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

export async function fetchSocialOverview(
  token: string | null,
  query: { preset?: string; start?: string; end?: string; platform?: string },
): Promise<SocialOverviewResponse> {
  const params = new URLSearchParams();
  if (query.preset) params.set("preset", query.preset);
  if (query.start) params.set("start", query.start);
  if (query.end) params.set("end", query.end);
  if (query.platform) params.set("platform", query.platform);
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/marketing/social/overview${q}`, { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export type SocialPostsQuery = {
  q?: string;
  status?: string;
  statuses?: string[];
  platform?: string;
  campaignId?: string;
  rangeFrom?: string;
  rangeTo?: string;
  unscheduled?: boolean;
  limit?: number;
  offset?: number;
};

export async function fetchSocialPosts(
  token: string | null,
  query: SocialPostsQuery = {},
): Promise<SocialPostWithMetrics[]> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.statuses?.length) params.set("statuses", query.statuses.join(","));
  if (query.platform) params.set("platform", query.platform);
  if (query.campaignId) params.set("campaignId", query.campaignId);
  if (query.rangeFrom) params.set("rangeFrom", query.rangeFrom);
  if (query.rangeTo) params.set("rangeTo", query.rangeTo);
  if (query.unscheduled) params.set("unscheduled", "1");
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/marketing/social/posts${q}`, { headers: headers(token), cache: "no-store" });
  const body = await parseJson<{ items: SocialPostWithMetrics[] }>(res);
  return body.items;
}

export async function fetchSocialPost(token: string | null, id: string): Promise<SocialPostWithMetrics> {
  const res = await fetch(`/api/marketing/social/posts/${id}`, { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export async function createSocialPost(
  token: string | null,
  body: Record<string, unknown>,
): Promise<SocialPostWithMetrics> {
  const res = await fetch("/api/marketing/social/posts", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function updateSocialPostApi(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<SocialPostWithMetrics> {
  const res = await fetch(`/api/marketing/social/posts/${id}`, {
    method: "PATCH",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function duplicateSocialPostApi(token: string | null, id: string): Promise<SocialPostWithMetrics> {
  const res = await fetch(`/api/marketing/social/posts/${id}`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "duplicate" }),
  });
  return parseJson(res);
}

export async function deleteSocialPostApi(token: string | null, id: string): Promise<void> {
  const res = await fetch(`/api/marketing/social/posts/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

export async function recordSocialPostMetrics(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`/api/marketing/social/posts/${id}/metrics`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchSocialAccounts(token: string | null): Promise<SocialAccount[]> {
  const res = await fetch("/api/marketing/social/accounts", { headers: headers(token), cache: "no-store" });
  const body = await parseJson<{ items: SocialAccount[] }>(res);
  return body.items;
}

export type SocialMediaAssetsQuery = {
  q?: string;
  assetType?: SocialMediaAssetType;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
  ids?: string[];
};

export async function fetchSocialMediaAssets(
  token: string | null,
  query: SocialMediaAssetsQuery = {},
): Promise<SocialMediaAsset[]> {
  if (query.ids?.length) {
    const loaded: SocialMediaAsset[] = [];
    for (const id of query.ids) {
      try {
        loaded.push(await fetchSocialMediaAsset(token, id));
      } catch {
        /* skip missing */
      }
    }
    return loaded;
  }
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.assetType) params.set("type", query.assetType);
  if (query.includeArchived) params.set("includeArchived", "1");
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  const q = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/marketing/social/media-assets${q}`, { headers: headers(token), cache: "no-store" });
  const body = await parseJson<{ items: SocialMediaAsset[] }>(res);
  return body.items;
}

export async function fetchSocialMediaAsset(
  token: string | null,
  id: string,
  withUsage = false,
): Promise<SocialMediaAsset> {
  const q = withUsage ? "?usage=1" : "";
  const res = await fetch(`/api/marketing/social/media-assets/${id}${q}`, {
    headers: headers(token),
    cache: "no-store",
  });
  return parseJson(res);
}

export async function uploadSocialMediaAsset(
  token: string | null,
  file: File,
  meta?: { title?: string; altText?: string },
): Promise<SocialMediaAsset> {
  const form = new FormData();
  form.append("file", file);
  if (meta?.title) form.append("title", meta.title);
  if (meta?.altText) form.append("altText", meta.altText);
  const res = await fetch("/api/marketing/social/media-assets", {
    method: "POST",
    headers: headers(token),
    body: form,
  });
  return parseJson(res);
}

export async function updateSocialMediaAsset(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<SocialMediaAsset> {
  const res = await fetch(`/api/marketing/social/media-assets/${id}`, {
    method: "PATCH",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function archiveSocialMediaAsset(token: string | null, id: string): Promise<SocialMediaAsset> {
  return updateSocialMediaAsset(token, id, { archive: true });
}

export async function deleteSocialMediaAsset(token: string | null, id: string, force = false): Promise<void> {
  const q = force ? "?force=1" : "";
  const res = await fetch(`/api/marketing/social/media-assets/${id}${q}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

export async function validateSocialMediaForPlatform(
  token: string | null,
  platform: SocialPlatformId,
  assetIds: string[],
): Promise<{ ok: boolean; issues: { code: string; message: string; assetId?: string }[] }> {
  const res = await fetch("/api/marketing/social/media-assets/validate", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ platform, assetIds }),
  });
  return parseJson(res);
}

export async function buildSocialTrackedLink(
  token: string | null,
  body: Record<string, unknown>,
): Promise<{ id: string; trackedUrl: string; label: string }> {
  const res = await fetch("/api/marketing/social/links", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

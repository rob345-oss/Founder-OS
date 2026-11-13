import { getCrmConfig } from "./config";
import type { TgAuthMe, TgLeadRecord } from "./types";

type FetchResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

function apiRoot(): string {
  return getCrmConfig().tgApiBaseUrl.replace(/\/$/, "");
}

async function tgFetch<T>(
  path: string,
  bearer: string,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<FetchResult<T>> {
  const cfg = getCrmConfig();
  const timeout = timeoutMs ?? cfg.backendTimeoutMs;
  try {
    const res = await fetch(`${apiRoot()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearer}`,
        ...(init?.headers ?? {}),
      },
      signal: init?.signal ?? AbortSignal.timeout(timeout),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export function isSuperAdminProfile(me: TgAuthMe): boolean {
  const role = (me.application_role ?? "").toLowerCase();
  if (role === "super_admin") return true;
  const roles = (me.roles ?? []).map((r) => r.toLowerCase());
  return roles.includes("super_admin");
}

export async function fetchTgAuthMe(bearer: string): Promise<FetchResult<TgAuthMe>> {
  const cfg = getCrmConfig();
  const authMeTimeout = Math.min(
    cfg.backendTimeoutMs,
    Number(process.env.CRM_AUTH_ME_TIMEOUT_MS ?? "8000"),
  );
  return tgFetch<TgAuthMe>("/v1/auth/me", bearer, undefined, authMeTimeout);
}

type LeadListResponse = { items?: TgLeadRecord[]; leads?: TgLeadRecord[]; total?: number };

export async function fetchTgLeadsPage(
  bearer: string,
  params: { limit?: number; offset?: number; topic?: string },
): Promise<FetchResult<{ items: TgLeadRecord[]; total: number }>> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 200));
  q.set("offset", String(params.offset ?? 0));
  q.set("sort", "created_at");
  q.set("direction", "desc");
  if (params.topic) q.set("topic", params.topic);

  const result = await tgFetch<LeadListResponse>(`/v1/analytics/leads?${q.toString()}`, bearer);
  if (!result.ok) return result;
  const items = result.data.items ?? result.data.leads ?? [];
  return { ok: true, data: { items, total: result.data.total ?? items.length } };
}

export async function fetchAllTgLeads(bearer: string): Promise<FetchResult<TgLeadRecord[]>> {
  const all: TgLeadRecord[] = [];
  let offset = 0;
  const limit = 200;
  for (let page = 0; page < 50; page += 1) {
    const pageResult = await fetchTgLeadsPage(bearer, { limit, offset });
    if (!pageResult.ok) return pageResult;
    all.push(...pageResult.data.items);
    if (pageResult.data.items.length < limit) break;
    offset += limit;
  }
  return { ok: true, data: all };
}

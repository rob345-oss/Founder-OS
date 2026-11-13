import type {
  CrmContact,
  CrmContactListItem,
  CrmDashboardMetrics,
  CrmEmailMessage,
  CrmFollowUp,
  CrmNote,
  CrmActivity,
  CrmPipelineStage,
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

export type CrmSessionInfo = {
  authorized: boolean;
  email?: string | null;
  role?: string | null;
};

export async function fetchCrmSession(token: string | null): Promise<CrmSessionInfo> {
  if (!token) return { authorized: false };
  const { fetchCrmSessionDeduped } = await import("./session-fetch");
  return fetchCrmSessionDeduped(token);
}

export async function fetchCrmDashboard(token: string | null, sync = false): Promise<CrmDashboardMetrics> {
  const q = sync ? "?sync=1" : "";
  const res = await fetch(`/api/crm/dashboard${q}`, { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export async function syncCrmWaitlist(token: string | null): Promise<{ upserted: number; created: number; leadCount: number }> {
  const res = await fetch("/api/crm/sync/waitlist", { method: "POST", headers: headers(token) });
  return parseJson(res);
}

export async function fetchCrmContacts(
  token: string | null,
  query: Record<string, string | number | boolean | undefined>,
): Promise<{ items: CrmContactListItem[]; total: number }> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const res = await fetch(`/api/crm/contacts?${params.toString()}`, { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export async function fetchCrmContact(token: string | null, id: string): Promise<{
  contact: CrmContact;
  notes: CrmNote[];
  activities: CrmActivity[];
  emails: CrmEmailMessage[];
  followUps: CrmFollowUp[];
}> {
  const res = await fetch(`/api/crm/contacts/${id}`, { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export async function createCrmContact(
  token: string | null,
  body: Record<string, unknown>,
): Promise<CrmContact> {
  const res = await fetch("/api/crm/contacts", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function updateCrmContact(
  token: string | null,
  id: string,
  body: Record<string, unknown>,
): Promise<CrmContact> {
  const res = await fetch(`/api/crm/contacts/${id}`, {
    method: "PATCH",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function addCrmNote(token: string | null, contactId: string, body: string): Promise<CrmNote> {
  const res = await fetch(`/api/crm/contacts/${contactId}/notes`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return parseJson(res);
}

export async function createCrmFollowUp(
  token: string | null,
  body: {
    contactId: string;
    title: string;
    description?: string;
    dueAt: string;
    priority?: string;
  },
): Promise<CrmFollowUp> {
  const res = await fetch("/api/crm/follow-ups", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function completeCrmFollowUp(token: string | null, id: string): Promise<CrmFollowUp> {
  const res = await fetch(`/api/crm/follow-ups/${id}/complete`, { method: "POST", headers: headers(token) });
  return parseJson(res);
}

export async function fetchCrmFollowUps(token: string | null): Promise<CrmFollowUp[]> {
  const res = await fetch("/api/crm/follow-ups", { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ items: CrmFollowUp[] }>(res);
  return data.items;
}

export async function fetchCrmEmails(token: string | null): Promise<CrmEmailMessage[]> {
  const res = await fetch("/api/crm/emails", { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ items: CrmEmailMessage[] }>(res);
  return data.items;
}

export async function fetchCrmPipeline(
  token: string | null,
): Promise<{ items: CrmContactListItem[]; stages: CrmPipelineStage[] }> {
  const res = await fetch("/api/crm/pipeline", { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export async function moveCrmPipelineStage(
  token: string | null,
  contactId: string,
  pipelineStage: CrmPipelineStage,
): Promise<CrmContact> {
  return updateCrmContact(token, contactId, { pipelineStage });
}

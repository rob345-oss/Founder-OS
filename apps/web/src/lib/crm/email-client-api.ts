import type {
  AudienceFilter,
  CrmEmailCampaign,
  CrmEmailCampaignAnalytics,
  CrmEmailActivityItem,
  CrmEmailLabel,
  CrmEmailOverviewMetrics,
  CrmEmailSegment,
  CrmEmailTemplate,
  CrmEmailTemplateVersion,
  EmailBlock,
  EmailLocale,
} from "./email/types";

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

export async function fetchEmailOverview(token: string | null, days = 30): Promise<CrmEmailOverviewMetrics> {
  const res = await fetch(`/api/crm/email/overview?days=${days}`, { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ metrics: CrmEmailOverviewMetrics }>(res);
  return data.metrics;
}

export async function fetchEmailLabels(token: string | null): Promise<CrmEmailLabel[]> {
  const res = await fetch("/api/crm/email/labels", { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ items: CrmEmailLabel[] }>(res);
  return data.items;
}

export async function createEmailLabel(token: string | null, name: string, color?: string): Promise<CrmEmailLabel> {
  const res = await fetch("/api/crm/email/labels", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  const data = await parseJson<{ label: CrmEmailLabel }>(res);
  return data.label;
}

export async function fetchEmailTemplates(token: string | null): Promise<CrmEmailTemplate[]> {
  const res = await fetch("/api/crm/email/templates", { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ items: CrmEmailTemplate[] }>(res);
  return data.items;
}

export async function fetchEmailTemplate(token: string | null, id: string): Promise<{
  template: CrmEmailTemplate;
  version: CrmEmailTemplateVersion | null;
}> {
  const res = await fetch(`/api/crm/email/templates/${id}`, { headers: headers(token), cache: "no-store" });
  return parseJson(res);
}

export async function saveEmailTemplateApi(
  token: string | null,
  body: {
    id?: string;
    name: string;
    description?: string;
    locale: EmailLocale;
    communicationType: "promotional" | "transactional";
    fromName: string;
    fromAddress?: string;
    subject: string;
    previewText: string;
    blocks: EmailBlock[];
    labelIds: string[];
  },
): Promise<{ template: CrmEmailTemplate; version: CrmEmailTemplateVersion }> {
  const res = await fetch("/api/crm/email/templates", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchEmailCampaigns(token: string | null): Promise<CrmEmailCampaign[]> {
  const res = await fetch("/api/crm/email/campaigns", { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ items: CrmEmailCampaign[] }>(res);
  return data.items;
}

export async function fetchEmailCampaign(token: string | null, id: string): Promise<CrmEmailCampaign> {
  const res = await fetch(`/api/crm/email/campaigns/${id}`, { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ campaign: CrmEmailCampaign }>(res);
  return data.campaign;
}

export async function saveEmailCampaignApi(
  token: string | null,
  body: Partial<CrmEmailCampaign> & { name: string; audienceFilter: AudienceFilter; labelIds: string[] },
): Promise<CrmEmailCampaign> {
  const res = await fetch("/api/crm/email/campaigns", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ campaign: CrmEmailCampaign }>(res);
  return data.campaign;
}

export async function previewCampaignAudienceApi(
  token: string | null,
  campaignId: string,
  body: { audienceFilter?: AudienceFilter; excludedContactIds?: string[] },
): Promise<{ totalEligible: number; sample: Array<{ id: string; fullName: string; primaryEmail: string }>; excluded: unknown[] }> {
  const res = await fetch(`/api/crm/email/campaigns/${campaignId}/audience`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function sendCampaignTestEmail(token: string | null, campaignId: string, toAddress: string): Promise<void> {
  const res = await fetch(`/api/crm/email/campaigns/${campaignId}/test`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ toAddress }),
  });
  await parseJson(res);
}

export async function scheduleCampaignApi(
  token: string | null,
  campaignId: string,
  scheduledAt: string,
): Promise<void> {
  const res = await fetch(`/api/crm/email/campaigns/${campaignId}/schedule`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledAt, confirmed: true }),
  });
  await parseJson(res);
}

export async function sendCampaignNowApi(token: string | null, campaignId: string): Promise<void> {
  const res = await fetch(`/api/crm/email/campaigns/${campaignId}/send-now`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed: true }),
  });
  await parseJson(res);
}

export async function cancelCampaignApi(token: string | null, campaignId: string): Promise<void> {
  const res = await fetch(`/api/crm/email/campaigns/${campaignId}/cancel`, {
    method: "POST",
    headers: headers(token),
  });
  await parseJson(res);
}

export async function fetchCampaignAnalytics(token: string | null, campaignId: string): Promise<CrmEmailCampaignAnalytics> {
  const res = await fetch(`/api/crm/email/campaigns/${campaignId}/analytics`, { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ analytics: CrmEmailCampaignAnalytics }>(res);
  return data.analytics;
}

export async function fetchEmailCalendar(token: string | null) {
  const res = await fetch("/api/crm/email/calendar", { headers: headers(token), cache: "no-store" });
  return parseJson<{ items: Array<{ id: string; name: string; status: string; scheduledAt: string | null }> }>(res);
}

export async function fetchEmailSegments(token: string | null): Promise<CrmEmailSegment[]> {
  const res = await fetch("/api/crm/email/segments", { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ items: CrmEmailSegment[] }>(res);
  return data.items;
}

export async function saveEmailSegmentApi(
  token: string | null,
  body: { name: string; description?: string; filter: AudienceFilter; id?: string },
): Promise<CrmEmailSegment> {
  const res = await fetch("/api/crm/email/segments", {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ segment: CrmEmailSegment }>(res);
  return data.segment;
}

export async function fetchContactEmailActivity(token: string | null, contactId: string): Promise<CrmEmailActivityItem[]> {
  const res = await fetch(`/api/crm/contacts/${contactId}/email-activity`, { headers: headers(token), cache: "no-store" });
  const data = await parseJson<{ items: CrmEmailActivityItem[] }>(res);
  return data.items;
}
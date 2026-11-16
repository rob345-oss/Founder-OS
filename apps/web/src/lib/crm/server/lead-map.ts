import type { CrmClassification, CrmRelationshipStatus, TgLeadRecord } from "../types";

export function classificationsFromLead(lead: TgLeadRecord): CrmClassification[] {
  const base: CrmClassification[] = [];
  switch (lead.topic) {
    case "waitlist":
      base.push("waitlist_candidate");
      if (lead.beta_testing_interest) base.push("pilot_candidate");
      break;
    case "partner":
      base.push("organization_partner");
      break;
    case "assessment":
      base.push("potential_customer");
      break;
    case "guardian_connect":
      base.push("general_contact");
      break;
    default:
      base.push("general_contact");
  }
  return [...new Set(base)];
}

export function relationshipFromLeadStatus(status: string | undefined): CrmRelationshipStatus {
  const s = (status ?? "new").toLowerCase();
  if (s.includes("convert")) return "converted";
  if (s.includes("pilot")) return "pilot_invited";
  if (s.includes("interest")) return "interested";
  if (s.includes("contact")) return "contacted";
  if (s.includes("inactive") || s.includes("closed")) return "inactive";
  if (s.includes("follow")) return "follow_up_needed";
  return "new";
}

export function waitlistSnapshotFromLead(lead: TgLeadRecord): Record<string, unknown> {
  return {
    topic: lead.topic,
    status: lead.status,
    message: lead.message ?? null,
    page: lead.page ?? null,
    country_code: lead.country_code ?? null,
    protection_audience: lead.protection_audience ?? null,
    beta_testing_interest: lead.beta_testing_interest ?? false,
    utm_source: lead.utm_source ?? null,
    utm_medium: lead.utm_medium ?? null,
    utm_campaign: lead.utm_campaign ?? null,
    utm_content: lead.utm_content ?? null,
    utm_term: lead.utm_term ?? null,
    tg_created_at: lead.created_at ?? null,
    tg_updated_at: lead.updated_at ?? null,
  };
}

export function contactSourceFromLead(lead: TgLeadRecord): string {
  if (lead.utm_source) return `utm:${lead.utm_source}`;
  if (lead.page) return `page:${lead.page}`;
  return `topic:${lead.topic}`;
}

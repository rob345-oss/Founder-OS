import type { CommunicationType } from "../email/types";
import type { AudienceFilter } from "../email/types";
import { normalizeEmail } from "../normalize";
import type { CrmContact } from "../types";
import { mapContactRow } from "./mappers";
import { getCrmDriver, getCrmSqlite, withPgClient } from "./db";
import { isEmailSuppressed } from "./email-suppressions";

type RawContactRow = Record<string, unknown>;

function eligibilityReason(
  row: RawContactRow,
  communicationType: CommunicationType,
  suppressed: boolean,
): string | null {
  if (suppressed) return "suppressed";
  if (!row.primary_email || !String(row.primary_email).includes("@")) return "invalid_email";
  const consent = row.marketing_consent;
  if (communicationType === "promotional") {
    if (consent !== true && consent !== 1) return "missing_marketing_consent";
  }
  return null;
}

function rowMatchesFilter(row: RawContactRow, filter: AudienceFilter): boolean {
  const tags = JSON.parse(String(row.tags ?? "[]")) as string[];
  const classifications = JSON.parse(String(row.classifications ?? "[]")) as string[];
  const mode = filter.mode ?? "all_eligible";

  if (mode === "manual" && filter.contactIds?.length) {
    return filter.contactIds.includes(String(row.id));
  }
  if (mode === "waitlist") {
    return classifications.includes("waitlist_candidate") || Boolean(row.tg_lead_id);
  }
  if (mode === "tags" && filter.tags?.length) {
    return filter.tags.some((t) => tags.includes(t));
  }
  if (mode === "country" && filter.countryCodes?.length) {
    return filter.countryCodes.includes(String(row.country_code ?? "").toUpperCase());
  }
  if (mode === "pipeline" && filter.pipelineStages?.length) {
    return filter.pipelineStages.includes(String(row.pipeline_stage));
  }
  if (mode === "date_range") {
    const created = String(row.date_added ?? row.created_at ?? "");
    if (filter.createdAfter && created < filter.createdAfter) return false;
    if (filter.createdBefore && created > filter.createdBefore) return false;
    return true;
  }
  if (mode === "segment" && filter.segmentId) {
    return true;
  }
  if (mode === "all_eligible") return true;
  return false;
}

async function fetchActiveContacts(): Promise<RawContactRow[]> {
  if (getCrmDriver() === "postgres") {
    return withPgClient(async (q) => q(`SELECT * FROM crm_contacts WHERE archived_at IS NULL`)) as Promise<RawContactRow[]>;
  }
  return getCrmSqlite()
    .prepare(`SELECT * FROM crm_contacts WHERE archived_at IS NULL`)
    .all() as RawContactRow[];
}

export type AudiencePreviewResult = {
  eligible: CrmContact[];
  excluded: Array<{ contactId: string; email: string; reason: string }>;
  totalEligible: number;
};

export async function previewCampaignAudience(input: {
  filter: AudienceFilter;
  excludedContactIds: string[];
  communicationType: CommunicationType;
}): Promise<AudiencePreviewResult> {
  const rows = await fetchActiveContacts();
  const excluded = new Set(input.excludedContactIds);
  const eligible: CrmContact[] = [];
  const excludedRows: AudiencePreviewResult["excluded"] = [];

  for (const row of rows) {
    const id = String(row.id);
    if (excluded.has(id)) {
      excludedRows.push({ contactId: id, email: String(row.primary_email), reason: "manual_exclusion" });
      continue;
    }
    if (!rowMatchesFilter(row, input.filter)) continue;

    const suppressed = await isEmailSuppressed(normalizeEmail(String(row.primary_email)));
    const reason = eligibilityReason(row, input.communicationType, suppressed);
    if (reason) {
      excludedRows.push({ contactId: id, email: String(row.primary_email), reason });
      continue;
    }
    eligible.push(mapContactRow(row));
  }

  // Deduplicate by normalized email
  const seen = new Set<string>();
  const deduped: CrmContact[] = [];
  for (const c of eligible) {
    const norm = normalizeEmail(c.primaryEmail);
    if (seen.has(norm)) continue;
    seen.add(norm);
    deduped.push(c);
  }

  return { eligible: deduped, excluded: excludedRows, totalEligible: deduped.length };
}
import type { CrmClassification, CrmPipelineStage, CrmRelationshipStatus } from "./types";

export const waitlistLeadSource = "waitlist";

const PIPELINE_RANK: Record<CrmPipelineStage, number> = {
  new_lead: 0,
  contacted: 1,
  interested: 2,
  qualified: 3,
  pilot_candidate: 4,
  pilot_active: 5,
  converted: 6,
  closed: 7,
};

const RELATIONSHIP_RANK: Record<CrmRelationshipStatus, number> = {
  new: 0,
  not_contacted: 1,
  contacted: 2,
  interested: 3,
  follow_up_needed: 4,
  pilot_invited: 5,
  pilot_active: 6,
  converted: 7,
  not_interested: 8,
  inactive: 9,
};

export function mergeClassifications(
  existing: CrmClassification[],
  incoming: CrmClassification[],
): CrmClassification[] {
  const seen = new Set<CrmClassification>();
  const out: CrmClassification[] = [];
  for (const c of [...existing, ...incoming]) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

export function mergeTags(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...existing, ...incoming].map((x) => x.trim()).filter(Boolean)) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

export function mergePipelineStage(existing: CrmPipelineStage, incoming: CrmPipelineStage): CrmPipelineStage {
  return PIPELINE_RANK[incoming] > PIPELINE_RANK[existing] ? incoming : existing;
}

export function mergeRelationshipStatus(
  existing: CrmRelationshipStatus,
  incoming: CrmRelationshipStatus,
): CrmRelationshipStatus {
  return RELATIONSHIP_RANK[incoming] > RELATIONSHIP_RANK[existing] ? incoming : existing;
}

/** Prefer explicit manual source; otherwise take incoming waitlist attribution when present. */
export function mergeContactSource(existing: string | null, incoming: string | null): string | null {
  if (!existing?.trim()) return incoming?.trim() || null;
  if (!incoming?.trim()) return existing.trim();
  if (existing.trim() === "manual" && incoming.trim() === waitlistLeadSource) return existing.trim();
  return incoming.trim();
}
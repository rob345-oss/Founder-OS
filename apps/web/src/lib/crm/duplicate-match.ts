import { normalizeEmail } from "./normalize";
import { normalizePhoneDigits, phonesLikelyMatch } from "./normalize-phone";

export type DuplicateMatchReason = "exact_email" | "tg_lead_id" | "possible_phone";

export type DuplicateListContact = {
  id: string;
  primaryEmail: string;
  tgLeadId?: string | null;
  phone?: string | null;
  fullName?: string;
};

export type DuplicateMatch = {
  contactId: string;
  reason: DuplicateMatchReason;
  fullName?: string;
  primaryEmail: string;
};

export type DuplicateProbe = {
  primaryEmail?: string | null;
  tgLeadId?: string | null;
  phone?: string | null;
  excludeContactId?: string;
};

export function findDuplicatesInList(
  candidate: DuplicateProbe,
  contacts: DuplicateListContact[],
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const seen = new Set<string>();
  const emailNorm = candidate.primaryEmail ? normalizeEmail(candidate.primaryEmail) : null;
  const phoneDigits = normalizePhoneDigits(candidate.phone);

  for (const c of contacts) {
    if (candidate.excludeContactId && c.id === candidate.excludeContactId) continue;

    if (candidate.tgLeadId && c.tgLeadId && candidate.tgLeadId === c.tgLeadId) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        matches.push({
          contactId: c.id,
          reason: "tg_lead_id",
          fullName: c.fullName,
          primaryEmail: c.primaryEmail,
        });
      }
      continue;
    }

    if (emailNorm && normalizeEmail(c.primaryEmail) === emailNorm) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        matches.push({
          contactId: c.id,
          reason: "exact_email",
          fullName: c.fullName,
          primaryEmail: c.primaryEmail,
        });
      }
      continue;
    }

    if (phoneDigits && phonesLikelyMatch(phoneDigits, c.phone)) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        matches.push({
          contactId: c.id,
          reason: "possible_phone",
          fullName: c.fullName,
          primaryEmail: c.primaryEmail,
        });
      }
    }
  }

  return matches;
}
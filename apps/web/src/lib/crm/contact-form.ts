import crypto from "node:crypto";

import { normalizeEmail } from "./normalize";
import { normalizePhoneDigits } from "./normalize-phone";
import type { CrmClassification, CrmContactPreferences, CrmPipelineStage, CrmRelationshipStatus } from "./types";

export const CONTACT_TYPE_OPTIONS = [
  { value: "family_friend", label: "Family / friend" },
  { value: "general_contact", label: "General contact" },
  { value: "waitlist_candidate", label: "Waitlist candidate" },
  { value: "potential_customer", label: "Potential customer" },
  { value: "pilot_candidate", label: "Pilot candidate" },
  { value: "active_customer", label: "Active customer" },
  { value: "organization_partner", label: "Organization / partner" },
  { value: "other", label: "Other" },
] as const;

export type ContactTypeOption = (typeof CONTACT_TYPE_OPTIONS)[number]["value"];

export const LIFECYCLE_OPTIONS = [
  { value: "new_lead", label: "New lead", relationshipStatus: "new", pipelineStage: "new_lead" },
  { value: "contacted", label: "Contacted", relationshipStatus: "contacted", pipelineStage: "contacted" },
  { value: "interested", label: "Interested", relationshipStatus: "interested", pipelineStage: "interested" },
  { value: "qualified", label: "Qualified", relationshipStatus: "interested", pipelineStage: "qualified" },
  { value: "pilot", label: "Pilot", relationshipStatus: "pilot_invited", pipelineStage: "pilot_candidate" },
  { value: "customer", label: "Customer", relationshipStatus: "converted", pipelineStage: "converted" },
] as const;

export type LifecycleOption = (typeof LIFECYCLE_OPTIONS)[number]["value"];

export const LEAD_SOURCE_OPTIONS = [
  { value: "manual", label: "Manual entry" },
  { value: "referral", label: "Referral" },
  { value: "event", label: "Event / conference" },
  { value: "inbound", label: "Inbound" },
  { value: "waitlist", label: "Waitlist sync" },
  { value: "other", label: "Other" },
] as const;

export type LeadSourceOption = (typeof LEAD_SOURCE_OPTIONS)[number]["value"];

const SYNTHETIC_EMAIL_DOMAIN = "founder-os.local";

export type ContactFormInput = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  primaryEmail?: string;
  phone?: string;
  countryCode?: string;
  organization?: string;
  contactType: ContactTypeOption;
  lifecycle: LifecycleOption;
  leadSource: LeadSourceOption | string;
  tags?: string[];
  marketingConsent?: boolean | null;
  preferredChannel?: CrmContactPreferences["preferredChannel"];
  doNotContact?: boolean;
  preferenceNotes?: string;
};

export type ContactFormValidation =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string> };

export function classificationFromContactType(contactType: ContactTypeOption): CrmClassification[] {
  return [contactType];
}

export function pipelineAndRelationshipFromLifecycle(lifecycle: LifecycleOption): {
  relationshipStatus: CrmRelationshipStatus;
  pipelineStage: CrmPipelineStage;
} {
  const row = LIFECYCLE_OPTIONS.find((o) => o.value === lifecycle);
  return {
    relationshipStatus: row?.relationshipStatus ?? "new",
    pipelineStage: row?.pipelineStage ?? "new_lead",
  };
}

export function buildFullName(input: Pick<ContactFormInput, "firstName" | "lastName" | "fullName">): string {
  if (input.fullName?.trim()) return input.fullName.trim();
  return [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
}

export function resolvePrimaryEmail(
  input: Pick<ContactFormInput, "primaryEmail" | "firstName" | "lastName" | "fullName">,
  opts?: { suffix?: string },
): string {
  const raw = input.primaryEmail?.trim() ?? "";
  if (raw.includes("@")) return normalizeEmail(raw);
  const baseName = buildFullName(input) || "contact";
  const slug =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "contact";
  const suffix = opts?.suffix ?? crypto.randomUUID().slice(0, 8);
  return `${slug}.${suffix}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function isSyntheticCrmEmail(email: string): boolean {
  return normalizeEmail(email).endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

export function contactPreferencesFromForm(input: ContactFormInput): CrmContactPreferences {
  const prefs: CrmContactPreferences = {};
  if (input.preferredChannel) prefs.preferredChannel = input.preferredChannel;
  if (input.doNotContact) prefs.doNotContact = true;
  if (input.preferenceNotes?.trim()) prefs.notes = input.preferenceNotes.trim();
  return prefs;
}

export function validateContactForm(input: ContactFormInput): ContactFormValidation {
  const fieldErrors: Record<string, string> = {};
  const email = input.primaryEmail?.trim() ?? "";
  const phone = normalizePhoneDigits(input.phone);

  if (!email && !phone) {
    fieldErrors.contact = "Provide an email or phone number.";
  }

  if (email && !email.includes("@")) {
    fieldErrors.primaryEmail = "Email must include @.";
  }

  if (!input.contactType) fieldErrors.contactType = "Contact type is required.";
  if (!input.lifecycle) fieldErrors.lifecycle = "Lifecycle is required.";
  if (!input.leadSource?.trim()) fieldErrors.leadSource = "Lead source is required.";

  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true };
}

export function createContactInputFromForm(input: ContactFormInput) {
  const validation = validateContactForm(input);
  if (!validation.ok) return { validation, input: null };

  const fullName = buildFullName(input);
  const primaryEmail = resolvePrimaryEmail(input);
  const { relationshipStatus, pipelineStage } = pipelineAndRelationshipFromLifecycle(input.lifecycle);

  return {
    validation,
    input: {
      fullName,
      primaryEmail,
      phone: input.phone?.trim() || null,
      countryCode: input.countryCode?.trim() || null,
      organization: input.organization?.trim() || null,
      contactSource: input.leadSource.trim(),
      classifications: classificationFromContactType(input.contactType),
      relationshipStatus,
      pipelineStage,
      tags: input.tags ?? [],
      marketingConsent: input.marketingConsent ?? null,
      contactPreferences: contactPreferencesFromForm(input),
    },
  };
}
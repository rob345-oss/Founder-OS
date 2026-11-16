import { normalizeEmail } from "./normalize";
import type { CrmClassification, CrmContact, CrmPipelineStage, CrmRelationshipStatus } from "./types";

export const CRM_EMAIL_LABELS = ["personal", "work", "other"] as const;
export const CRM_PHONE_LABELS = ["mobile", "work", "home", "whatsapp", "other"] as const;
export const CRM_ADDRESS_LABELS = ["home", "work", "mailing", "other"] as const;
export const CRM_SOCIAL_PLATFORMS = [
  "linkedin",
  "instagram",
  "facebook",
  "x",
  "whatsapp",
  "personal_website",
  "company_website",
  "youtube",
  "other",
] as const;

export const CRM_COMM_METHODS = [
  "email",
  "phone",
  "sms",
  "whatsapp",
  "linkedin",
  "in_person",
  "none",
] as const;

export const CRM_COMM_TIMES = ["morning", "afternoon", "evening", "none"] as const;
export const CRM_COMM_LANGUAGES = ["english", "spanish", "other"] as const;

export const CRM_LIFECYCLE_STAGES = ["contact", "lead", "qualified_lead", "customer", "archived"] as const;
export const CRM_RELATIONSHIP_CATEGORIES = [
  "potential_customer",
  "caregiver",
  "family_member",
  "investor",
  "partner",
  "referral",
  "personal",
  "other",
] as const;

export type CrmContactEmailEntry = {
  id: string;
  address: string;
  label: (typeof CRM_EMAIL_LABELS)[number];
  isPrimary: boolean;
};

export type CrmContactPhoneEntry = {
  id: string;
  number: string;
  countryCallingCode: string;
  label: (typeof CRM_PHONE_LABELS)[number];
  isPrimary: boolean;
};

export type CrmContactSocialEntry = {
  id: string;
  platform: (typeof CRM_SOCIAL_PLATFORMS)[number];
  url: string;
  customLabel?: string;
};

export type CrmContactAddressEntry = {
  id: string;
  label: (typeof CRM_ADDRESS_LABELS)[number];
  street: string;
  unit: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type CrmContactProfile = {
  version: 1;
  identity: {
    firstName: string;
    middleName: string;
    lastName: string;
    preferredName: string;
    company: string;
    jobTitle: string;
    department: string;
    photoDataUrl: string | null;
  };
  emails: CrmContactEmailEntry[];
  phones: CrmContactPhoneEntry[];
  socialLinks: CrmContactSocialEntry[];
  addresses: CrmContactAddressEntry[];
  communication: {
    preferredMethod: (typeof CRM_COMM_METHODS)[number];
    preferredMethodRefId: string | null;
    preferredTime: (typeof CRM_COMM_TIMES)[number];
    preferredLanguage: (typeof CRM_COMM_LANGUAGES)[number];
    timezone: string;
    notes: string;
  };
  crm: {
    lifecycleStage: (typeof CRM_LIFECYCLE_STAGES)[number];
    relationshipCategory: (typeof CRM_RELATIONSHIP_CATEGORIES)[number];
    leadSource: string;
    firstContactDate: string | null;
  };
};

export type ContactEditorSavePayload = {
  profile: CrmContactProfile;
  relationshipStatus?: CrmRelationshipStatus;
  pipelineStage?: CrmPipelineStage;
  classifications?: CrmClassification[];
  tags?: string[];
  marketingConsent?: boolean | null;
  initialNote?: string;
};

export type ResolvedContactScalars = {
  fullName: string;
  primaryEmail: string;
  additionalEmails: string[];
  phone: string | null;
  countryCode: string | null;
  preferredLanguage: string | null;
  organization: string | null;
  contactSource: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function newContactMethodId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyContactProfile(): CrmContactProfile {
  return {
    version: 1,
    identity: {
      firstName: "",
      middleName: "",
      lastName: "",
      preferredName: "",
      company: "",
      jobTitle: "",
      department: "",
      photoDataUrl: null,
    },
    emails: [{ id: newContactMethodId(), address: "", label: "work", isPrimary: true }],
    phones: [{ id: newContactMethodId(), number: "", countryCallingCode: "+1", label: "mobile", isPrimary: true }],
    socialLinks: [],
    addresses: [],
    communication: {
      preferredMethod: "none",
      preferredMethodRefId: null,
      preferredTime: "none",
      preferredLanguage: "english",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      notes: "",
    },
    crm: {
      lifecycleStage: "contact",
      relationshipCategory: "potential_customer",
      leadSource: "",
      firstContactDate: null,
    },
  };
}

function splitFullName(fullName: string): Pick<CrmContactProfile["identity"], "firstName" | "middleName" | "lastName"> {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return { firstName: parts[0], middleName: parts.slice(1, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function composeFullName(identity: CrmContactProfile["identity"]): string {
  const preferred = identity.preferredName.trim();
  if (preferred) return preferred;
  return [identity.firstName, identity.middleName, identity.lastName].map((s) => s.trim()).filter(Boolean).join(" ");
}

export function parseContactProfile(raw: unknown): CrmContactProfile {
  if (!raw || typeof raw !== "object") return emptyContactProfile();
  const o = raw as Partial<CrmContactProfile>;
  if (o.version !== 1) return emptyContactProfile();
  const base = emptyContactProfile();
  return {
    version: 1,
    identity: { ...base.identity, ...(o.identity ?? {}) },
    emails: Array.isArray(o.emails) && o.emails.length ? o.emails : base.emails,
    phones: Array.isArray(o.phones) && o.phones.length ? o.phones : base.phones,
    socialLinks: Array.isArray(o.socialLinks) ? o.socialLinks : [],
    addresses: Array.isArray(o.addresses) ? o.addresses : [],
    communication: { ...base.communication, ...(o.communication ?? {}) },
    crm: { ...base.crm, ...(o.crm ?? {}) },
  };
}

export function contactToProfile(contact: CrmContact): CrmContactProfile {
  if (contact.profile && (contact.profile as { version?: number }).version === 1) {
    return parseContactProfile(contact.profile);
  }

  const profile = emptyContactProfile();
  const nameParts = splitFullName(contact.fullName);
  profile.identity = {
    ...profile.identity,
    ...nameParts,
    company: contact.organization ?? "",
  };

  const emails: CrmContactEmailEntry[] = [];
  if (contact.primaryEmail) {
    emails.push({ id: newContactMethodId(), address: contact.primaryEmail, label: "work", isPrimary: true });
  }
  for (const extra of contact.additionalEmails) {
    if (extra && extra !== contact.primaryEmail) {
      emails.push({ id: newContactMethodId(), address: extra, label: "other", isPrimary: false });
    }
  }
  profile.emails = emails.length ? emails : profile.emails;

  if (contact.phone) {
    profile.phones = [
      {
        id: newContactMethodId(),
        number: contact.phone,
        countryCallingCode: contact.countryCode ? `+${contact.countryCode.replace(/^\+/, "")}` : "+1",
        label: "mobile",
        isPrimary: true,
      },
    ];
  }

  if (contact.preferredLanguage) {
    const lang = contact.preferredLanguage.toLowerCase();
    profile.communication.preferredLanguage =
      lang.startsWith("es") ? "spanish" : lang.startsWith("en") ? "english" : "other";
  }

  return profile;
}

export function ensureSinglePrimary<T extends { id: string; isPrimary: boolean }>(items: T[]): T[] {
  const primaries = items.filter((i) => i.isPrimary);
  if (primaries.length <= 1) return items;
  const keep = primaries[0].id;
  return items.map((i) => ({ ...i, isPrimary: i.id === keep }));
}

function safeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateContactProfile(profile: CrmContactProfile): Record<string, string> {
  const errors: Record<string, string> = {};
  const emails = ensureSinglePrimary(profile.emails).filter((e) => e.address.trim());
  const primaryEmails = emails.filter((e) => e.isPrimary);

  if (!emails.length) {
    errors.emails = "At least one email address is required.";
  } else if (primaryEmails.length !== 1) {
    errors.emails = "Choose exactly one primary email.";
  }

  for (const email of emails) {
    if (!EMAIL_RE.test(email.address.trim())) {
      errors[`email:${email.id}`] = "Enter a valid email address.";
    }
  }

  const phones = ensureSinglePrimary(profile.phones).filter((p) => p.number.trim());
  const primaryPhones = phones.filter((p) => p.isPrimary);
  if (phones.length && primaryPhones.length !== 1) {
    errors.phones = "Choose exactly one primary phone number.";
  }

  for (const link of profile.socialLinks) {
    if (link.url.trim() && !safeHttpUrl(link.url.trim())) {
      errors[`social:${link.id}`] = "Use a valid http(s) URL.";
    }
  }

  const name = composeFullName(profile.identity);
  const org = profile.identity.company.trim();
  if (!name && !emails.some((e) => EMAIL_RE.test(e.address.trim())) && !org) {
    errors.identity = "Add a name, organization, or email.";
  }

  return errors;
}

export function resolveScalarsFromProfile(
  profile: CrmContactProfile,
  existing?: Pick<CrmContact, "contactSource">,
): ResolvedContactScalars {
  const normalized = {
    ...profile,
    emails: ensureSinglePrimary(profile.emails),
    phones: ensureSinglePrimary(profile.phones),
  };

  const emails = normalized.emails.filter((e) => e.address.trim());
  const primary = emails.find((e) => e.isPrimary) ?? emails[0];
  const additionalEmails = emails
    .filter((e) => e.id !== primary?.id)
    .map((e) => normalizeEmail(e.address.trim()))
    .filter(Boolean);

  const phones = normalized.phones.filter((p) => p.number.trim());
  const primaryPhone = phones.find((p) => p.isPrimary) ?? phones[0];

  const langMap: Record<string, string> = {
    english: "en",
    spanish: "es",
    other: normalized.communication.preferredLanguage === "other" ? "other" : "en",
  };

  let countryCode: string | null = null;
  if (primaryPhone?.countryCallingCode) {
    const digits = primaryPhone.countryCallingCode.replace(/\D/g, "");
    countryCode = digits.slice(0, 3) || null;
  }

  return {
    fullName: composeFullName(normalized.identity),
    primaryEmail: primary ? normalizeEmail(primary.address.trim()) : "",
    additionalEmails,
    phone: primaryPhone ? `${primaryPhone.countryCallingCode} ${primaryPhone.number}`.trim() : null,
    countryCode,
    preferredLanguage: langMap[normalized.communication.preferredLanguage] ?? null,
    organization: normalized.identity.company.trim() || null,
    contactSource: existing?.contactSource ?? "manual",
  };
}

export function lifecycleToPipeline(stage: CrmContactProfile["crm"]["lifecycleStage"]): CrmPipelineStage {
  switch (stage) {
    case "lead":
      return "new_lead";
    case "qualified_lead":
      return "qualified";
    case "customer":
      return "converted";
    case "archived":
      return "closed";
    default:
      return "new_lead";
  }
}

export function relationshipCategoryToClassifications(
  category: CrmContactProfile["crm"]["relationshipCategory"],
): CrmClassification[] {
  switch (category) {
    case "potential_customer":
      return ["potential_customer"];
    case "family_member":
      return ["family_friend"];
    case "partner":
      return ["organization_partner"];
    default:
      return ["general_contact"];
  }
}

export function sanitizeProfileForStorage(profile: CrmContactProfile): CrmContactProfile {
  const clean = parseContactProfile(profile);
  clean.emails = ensureSinglePrimary(clean.emails).map((e) => ({
    ...e,
    address: e.address.trim(),
  }));
  clean.phones = ensureSinglePrimary(clean.phones).map((p) => ({
    ...p,
    number: p.number.trim(),
  }));
  clean.socialLinks = clean.socialLinks
    .filter((s) => s.url.trim())
    .map((s) => ({ ...s, url: s.url.trim() }));
  if (clean.identity.photoDataUrl && clean.identity.photoDataUrl.length > 120_000) {
    clean.identity.photoDataUrl = null;
  }
  return clean;
}
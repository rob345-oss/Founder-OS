import { defaultCountryIso, findCountryByIso } from "./contact-countries";
import { normalizePhoneForDuplicateCheck, parseCrmPhoneEntry } from "./contact-phone";
import { normalizeEmail } from "./normalize";

import type { CrmClassification, CrmContact, CrmPipelineStage, CrmRelationshipStatus } from "./types";

export const CRM_EMAIL_LABELS = ["personal", "work", "other"] as const;
export const CRM_PHONE_LABELS = ["mobile", "work", "home", "personal", "whatsapp", "other"] as const;
export const CRM_ADDRESS_LABELS = ["home", "work", "mailing", "other"] as const;
export const CRM_SOCIAL_PLATFORMS = [
  "linkedin",
  "instagram",
  "facebook",
  "x",
  "whatsapp",
  "telegram",
  "tiktok",
  "youtube",
  "github",
  "personal_website",
  "company_website",
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

export const CRM_CONTACT_TYPES = ["individual", "organization"] as const;

export const CRM_LIFECYCLE_STAGES = ["contact", "lead", "qualified_lead", "customer", "archived"] as const;
export const CRM_RELATIONSHIP_CATEGORIES = [
  "potential_customer",
  "existing_customer",
  "caregiver",
  "family_member",
  "pilot_participant",
  "partner",
  "investor",
  "advisor",
  "supplier",
  "org_representative",
  "other",
] as const;

export const CRM_NOTE_CATEGORIES = [
  "general",
  "meeting",
  "phone_call",
  "email",
  "follow_up",
  "research",
  "personal_context",
  "other",
] as const;

export const CRM_CUSTOM_FIELD_TYPES = [
  "short_text",
  "long_text",
  "number",
  "date",
  "dropdown",
  "multi_select",
  "boolean",
  "url",
] as const;

export type CrmContactEmailEntry = {
  id: string;
  address: string;
  label: (typeof CRM_EMAIL_LABELS)[number];
  isPrimary: boolean;
  verified?: boolean;
};

export type CrmContactPhoneEntry = {
  id: string;
  number: string;
  countryIso: string;
  countryCallingCode: string;
  extension: string;
  e164: string | null;
  label: (typeof CRM_PHONE_LABELS)[number];
  isPrimary: boolean;
  whatsAppAvailable: boolean;
};

export type CrmContactSocialEntry = {
  id: string;
  platform: (typeof CRM_SOCIAL_PLATFORMS)[number];
  handle: string;
  url: string;
  notes: string;
  isPrimary: boolean;
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
  isPrimary: boolean;
};

export type CrmCustomFieldDefinition = {
  id: string;
  key: string;
  label: string;
  fieldType: (typeof CRM_CUSTOM_FIELD_TYPES)[number];
  options?: string[];
  required?: boolean;
};

export type CrmContactProfile = {
  version: 2;
  identity: {
    contactType: (typeof CRM_CONTACT_TYPES)[number];
    firstName: string;
    middleName: string;
    lastName: string;
    preferredName: string;
    namePronunciation: string;
    company: string;
    jobTitle: string;
    department: string;
    website: string;
    birthday: string | null;
    preferredLanguage: string;
    countryRegion: string;
    howWeMet: string;
    referralSource: string;
    dateFirstContacted: string | null;
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
    doNotCall: boolean;
    doNotEmail: boolean;
    doNotSms: boolean;
    doNotContact: boolean;
  };
  professional: {
    industry: string;
    companySize: string;
    organizationWebsite: string;
    roleInPurchasing: string;
    relationshipToTitaniumGuardian: string;
    linkedContactIds: string[];
  };
  relationship: {
    strength: string;
    introducedBy: string;
    firstInteractionDate: string | null;
    mostRecentInteractionDate: string | null;
    nextFollowUpDate: string | null;
    relationshipOwner: string;
    priority: string;
    associatedCampaign: string;
    associatedLeadSource: string;
  };
  crm: {
    lifecycleStage: (typeof CRM_LIFECYCLE_STAGES)[number];
    relationshipCategories: (typeof CRM_RELATIONSHIP_CATEGORIES)[number][];
    leadSource: string;
    firstContactDate: string | null;
  };
  customFieldValues: Record<string, string | number | boolean | string[] | null>;
};

export type ContactEditorSavePayload = {
  profile: CrmContactProfile;
  relationshipStatus?: CrmRelationshipStatus;
  pipelineStage?: CrmPipelineStage;
  classifications?: CrmClassification[];
  tags?: string[];
  marketingConsent?: boolean | null;
  initialNote?: string;
  initialNoteCategory?: (typeof CRM_NOTE_CATEGORIES)[number];
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
  const iso = defaultCountryIso();
  const country = findCountryByIso(iso) ?? findCountryByIso("US")!;
  return {
    version: 2,
    identity: {
      contactType: "individual",
      firstName: "",
      middleName: "",
      lastName: "",
      preferredName: "",
      namePronunciation: "",
      company: "",
      jobTitle: "",
      department: "",
      website: "",
      birthday: null,
      preferredLanguage: "",
      countryRegion: "",
      howWeMet: "",
      referralSource: "",
      dateFirstContacted: null,
      photoDataUrl: null,
    },
    emails: [{ id: newContactMethodId(), address: "", label: "work", isPrimary: true }],
    phones: [
      {
        id: newContactMethodId(),
        number: "",
        countryIso: country.iso,
        countryCallingCode: country.callingCode,
        extension: "",
        e164: null,
        label: "mobile",
        isPrimary: true,
        whatsAppAvailable: false,
      },
    ],
    socialLinks: [],
    addresses: [],
    communication: {
      preferredMethod: "none",
      preferredMethodRefId: null,
      preferredTime: "none",
      preferredLanguage: "english",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      notes: "",
      doNotCall: false,
      doNotEmail: false,
      doNotSms: false,
      doNotContact: false,
    },
    professional: {
      industry: "",
      companySize: "",
      organizationWebsite: "",
      roleInPurchasing: "",
      relationshipToTitaniumGuardian: "",
      linkedContactIds: [],
    },
    relationship: {
      strength: "",
      introducedBy: "",
      firstInteractionDate: null,
      mostRecentInteractionDate: null,
      nextFollowUpDate: null,
      relationshipOwner: "",
      priority: "",
      associatedCampaign: "",
      associatedLeadSource: "",
    },
    crm: {
      lifecycleStage: "contact",
      relationshipCategories: ["potential_customer"],
      leadSource: "",
      firstContactDate: null,
    },
    customFieldValues: {},
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

function upgradeLegacyPhone(p: Record<string, unknown>): CrmContactPhoneEntry {
  const id = String(p.id ?? newContactMethodId());
  const countryCallingCode = String(p.countryCallingCode ?? "+1");
  const countryIso = String(p.countryIso ?? findCountryByCallingIso(countryCallingCode));
  const number = String(p.number ?? "");
  const normalized = parseCrmPhoneEntry(countryIso, number, countryCallingCode, String(p.extension ?? ""));
  return {
    id,
    number: normalized.nationalNumber || number,
    countryIso: normalized.countryIso || countryIso,
    countryCallingCode: normalized.countryCallingCode || countryCallingCode,
    extension: String(p.extension ?? ""),
    e164: normalized.e164,
    label: (CRM_PHONE_LABELS.includes(p.label as (typeof CRM_PHONE_LABELS)[number])
      ? p.label
      : "mobile") as CrmContactPhoneEntry["label"],
    isPrimary: Boolean(p.isPrimary),
    whatsAppAvailable: Boolean(p.whatsAppAvailable ?? p.label === "whatsapp"),
  };
}

function findCountryByCallingIso(code: string): string {
  const c = findCountryByIso("US");
  if (code === "+1") return "US";
  return c?.iso ?? "US";
}

function upgradeLegacySocial(s: Record<string, unknown>): CrmContactSocialEntry {
  return {
    id: String(s.id ?? newContactMethodId()),
    platform: (CRM_SOCIAL_PLATFORMS.includes(s.platform as (typeof CRM_SOCIAL_PLATFORMS)[number])
      ? s.platform
      : "other") as CrmContactSocialEntry["platform"],
    handle: String(s.handle ?? ""),
    url: String(s.url ?? ""),
    notes: String(s.notes ?? ""),
    isPrimary: Boolean(s.isPrimary),
    customLabel: s.customLabel ? String(s.customLabel) : undefined,
  };
}

export function parseContactProfile(raw: unknown): CrmContactProfile {
  if (!raw || typeof raw !== "object") return emptyContactProfile();
  const o = raw as Record<string, unknown>;
  const base = emptyContactProfile();

  const ver = o.version === 2 || o.version === 1 ? Number(o.version) : 1;
  const identityRaw = (o.identity ?? {}) as Record<string, unknown>;
  const commRaw = (o.communication ?? {}) as Record<string, unknown>;
  const crmRaw = (o.crm ?? {}) as Record<string, unknown>;
  const profRaw = (o.professional ?? {}) as Record<string, unknown>;
  const relRaw = (o.relationship ?? {}) as Record<string, unknown>;

  const emails = Array.isArray(o.emails) && o.emails.length ? (o.emails as CrmContactEmailEntry[]) : base.emails;
  const phones = Array.isArray(o.phones) && o.phones.length
    ? (o.phones as Record<string, unknown>[]).map(upgradeLegacyPhone)
    : base.phones;
  const socialLinks = Array.isArray(o.socialLinks)
    ? (o.socialLinks as Record<string, unknown>[]).map(upgradeLegacySocial)
    : [];
  const addresses = Array.isArray(o.addresses)
    ? (o.addresses as CrmContactAddressEntry[]).map((a) => ({
        ...a,
        isPrimary: Boolean((a as { isPrimary?: boolean }).isPrimary),
      }))
    : [];

  let relationshipCategories = base.crm.relationshipCategories;
  if (Array.isArray(crmRaw.relationshipCategories)) {
    relationshipCategories = crmRaw.relationshipCategories as CrmContactProfile["crm"]["relationshipCategories"];
  } else if (crmRaw.relationshipCategory) {
    relationshipCategories = [crmRaw.relationshipCategory as (typeof CRM_RELATIONSHIP_CATEGORIES)[number]];
  }

  return {
    version: 2,
    identity: {
      ...base.identity,
      ...(identityRaw as Partial<CrmContactProfile["identity"]>),
    },
    emails,
    phones,
    socialLinks,
    addresses,
    communication: {
      ...base.communication,
      ...(commRaw as Partial<CrmContactProfile["communication"]>),
    },
    professional: { ...base.professional, ...(profRaw as Partial<CrmContactProfile["professional"]>) },
    relationship: { ...base.relationship, ...(relRaw as Partial<CrmContactProfile["relationship"]>) },
    crm: {
      ...base.crm,
      ...(crmRaw as Partial<CrmContactProfile["crm"]>),
      relationshipCategories,
    },
    customFieldValues:
      ver >= 2 && o.customFieldValues && typeof o.customFieldValues === "object"
        ? (o.customFieldValues as CrmContactProfile["customFieldValues"])
        : {},
  };
}

export function contactToProfile(contact: CrmContact): CrmContactProfile {
  if (contact.profile && (contact.profile as { version?: number }).version) {
    return parseContactProfile(contact.profile);
  }

  const profile = emptyContactProfile();
  const nameParts = splitFullName(contact.fullName);
  profile.identity = { ...profile.identity, ...nameParts, company: contact.organization ?? "" };

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
    const iso = contact.countryCode?.length === 2 ? contact.countryCode : "US";
    const digits = contact.phone.replace(/^\+\d+\s*/, "");
    const code = contact.phone.match(/^\+\d+/)?.[0] ?? "+1";
    const normalized = parseCrmPhoneEntry(iso, digits, code);
    profile.phones = [
      {
        id: newContactMethodId(),
        number: normalized.nationalNumber || digits,
        countryIso: normalized.countryIso,
        countryCallingCode: normalized.countryCallingCode,
        extension: "",
        e164: normalized.e164,
        label: "mobile",
        isPrimary: true,
        whatsAppAvailable: false,
      },
    ];
  }

  if (contact.preferredLanguage) {
    const lang = contact.preferredLanguage.toLowerCase();
    profile.communication.preferredLanguage =
      lang.startsWith("es") ? "spanish" : lang.startsWith("en") ? "english" : "other";
  }

  if (contact.classifications.length) {
    profile.crm.relationshipCategories = mapClassificationsToCategories(contact.classifications);
  }

  return profile;
}

function mapClassificationsToCategories(c: CrmClassification[]): CrmContactProfile["crm"]["relationshipCategories"] {
  const out: CrmContactProfile["crm"]["relationshipCategories"] = [];
  for (const cl of c) {
    if (cl === "potential_customer") out.push("potential_customer");
    else if (cl === "active_customer") out.push("existing_customer");
    else if (cl === "family_friend") out.push("family_member");
    else if (cl === "organization_partner") out.push("partner");
    else if (cl === "pilot_candidate") out.push("pilot_participant");
    else out.push("other");
  }
  return out.length ? out : ["other"];
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

  for (const ph of phones) {
    const n = parseCrmPhoneEntry(ph.countryIso, ph.number, ph.countryCallingCode, ph.extension);
    if (!n.valid && ph.number.replace(/\D/g, "").length < 7) {
      errors[`phone:${ph.id}`] = "Enter a valid phone number for the selected country.";
    }
  }

  for (const link of profile.socialLinks) {
    if (link.url.trim() && !safeHttpUrl(link.url.trim())) {
      errors[`social:${link.id}`] = "Use a valid http(s) URL.";
    }
  }

  if (profile.identity.website.trim() && !safeHttpUrl(profile.identity.website.trim())) {
    errors["identity.website"] = "Enter a valid website URL.";
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
    phones: ensureSinglePrimary(profile.phones).map((p) => {
      const n = parseCrmPhoneEntry(p.countryIso, p.number, p.countryCallingCode, p.extension);
      return { ...p, e164: n.e164, countryIso: n.countryIso, countryCallingCode: n.countryCallingCode, number: n.nationalNumber || p.number };
    }),
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

  const countryCode = primaryPhone?.countryIso?.slice(0, 2) ?? null;

  return {
    fullName: composeFullName(normalized.identity),
    primaryEmail: primary ? normalizeEmail(primary.address.trim()) : "",
    additionalEmails,
    phone: primaryPhone?.e164 ?? (primaryPhone ? `${primaryPhone.countryCallingCode}${primaryPhone.number}` : null),
    countryCode,
    preferredLanguage:
      normalized.identity.preferredLanguage.trim() ||
      langMap[normalized.communication.preferredLanguage] ||
      null,
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

export function relationshipCategoriesToClassifications(
  categories: CrmContactProfile["crm"]["relationshipCategories"],
): CrmClassification[] {
  const out = new Set<CrmClassification>();
  for (const category of categories) {
    switch (category) {
      case "potential_customer":
        out.add("potential_customer");
        break;
      case "existing_customer":
        out.add("active_customer");
        break;
      case "family_member":
        out.add("family_friend");
        break;
      case "partner":
        out.add("organization_partner");
        break;
      case "pilot_participant":
        out.add("pilot_candidate");
        break;
      default:
        out.add("general_contact");
    }
  }
  return out.size ? [...out] : ["general_contact"];
}

/** @deprecated use relationshipCategoriesToClassifications */
export function relationshipCategoryToClassifications(
  category: (typeof CRM_RELATIONSHIP_CATEGORIES)[number],
): CrmClassification[] {
  return relationshipCategoriesToClassifications([category]);
}

export function sanitizeProfileForStorage(profile: CrmContactProfile): CrmContactProfile {
  const clean = parseContactProfile({ ...profile, version: 2 });
  clean.emails = ensureSinglePrimary(clean.emails).map((e) => ({
    ...e,
    address: e.address.trim(),
  }));
  clean.phones = ensureSinglePrimary(clean.phones).map((p) => {
    const n = parseCrmPhoneEntry(p.countryIso, p.number, p.countryCallingCode, p.extension);
    return {
      ...p,
      number: n.nationalNumber || p.number.trim(),
      countryIso: n.countryIso,
      countryCallingCode: n.countryCallingCode,
      e164: n.e164,
    };
  });
  clean.socialLinks = clean.socialLinks
    .filter((s) => s.url.trim() || s.handle.trim())
    .map((s) => ({ ...s, url: s.url.trim() }));
  if (clean.identity.photoDataUrl && clean.identity.photoDataUrl.length > 120_000) {
    clean.identity.photoDataUrl = null;
  }
  return clean;
}

export function profilePhoneDigitsForSearch(profile: CrmContactProfile): string[] {
  return profile.phones
    .filter((p) => p.number.trim())
    .map((p) => normalizePhoneForDuplicateCheck(p.countryIso, p.number, p.countryCallingCode))
    .filter((x): x is string => Boolean(x));
}
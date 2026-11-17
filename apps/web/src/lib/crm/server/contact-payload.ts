import {
  contactToProfile,
  lifecycleToPipeline,
  parseContactProfile,
  relationshipCategoriesToClassifications,
  resolveScalarsFromProfile,
  sanitizeProfileForStorage,
  validateContactProfile,
  type CrmContactProfile,
} from "../contact-profile";
import type { CreateContactInput } from "./repository";
import type { CrmContact, CrmContactProfilePayload } from "../types";

export type ParsedContactWrite = {
  input: CreateContactInput;
  initialNote?: string;
  validationErrors: Record<string, string>;
};

export function parseContactWriteBody(
  body: Record<string, unknown>,
  existing?: CrmContact | null,
): ParsedContactWrite {
  if (body.profile && typeof body.profile === "object") {
    const payload = body as CrmContactProfilePayload;
    const profile = sanitizeProfileForStorage(parseContactProfile(payload.profile));
    const errors = validateContactProfile(profile);
    const scalars = resolveScalarsFromProfile(profile, existing ?? undefined);

    const input: CreateContactInput = {
      fullName: scalars.fullName,
      primaryEmail: scalars.primaryEmail,
      additionalEmails: scalars.additionalEmails,
      phone: scalars.phone,
      countryCode: scalars.countryCode,
      preferredLanguage: scalars.preferredLanguage,
      organization: scalars.organization,
      contactSource: scalars.contactSource ?? existing?.contactSource ?? "manual",
      classifications:
        payload.classifications ??
        relationshipCategoriesToClassifications(profile.crm.relationshipCategories),
      relationshipStatus: payload.relationshipStatus ?? existing?.relationshipStatus ?? "new",
      pipelineStage: payload.pipelineStage ?? lifecycleToPipeline(profile.crm.lifecycleStage),
      tags: payload.tags ?? existing?.tags,
      marketingConsent: payload.marketingConsent ?? existing?.marketingConsent ?? null,
      contactPreferences: profile as unknown as Record<string, unknown>,
    };

    if (profile.crm.leadSource.trim()) {
      input.contactSource = profile.crm.leadSource.trim();
    }

    return {
      input,
      initialNote: typeof payload.initialNote === "string" ? payload.initialNote.trim() : undefined,
      validationErrors: errors,
    };
  }

  if (typeof body.primaryEmail !== "string" || !body.primaryEmail.includes("@")) {
    return {
      input: { primaryEmail: "" },
      validationErrors: { primaryEmail: "primaryEmail is required" },
    };
  }

  return {
    input: {
      fullName: typeof body.fullName === "string" ? body.fullName : "",
      primaryEmail: body.primaryEmail,
      additionalEmails: Array.isArray(body.additionalEmails) ? body.additionalEmails.map(String) : [],
      phone: typeof body.phone === "string" ? body.phone : null,
      countryCode: typeof body.countryCode === "string" ? body.countryCode : null,
      organization: typeof body.organization === "string" ? body.organization : null,
      contactSource: typeof body.contactSource === "string" ? body.contactSource : "manual",
      classifications: Array.isArray(body.classifications) ? (body.classifications as CreateContactInput["classifications"]) : undefined,
      relationshipStatus: typeof body.relationshipStatus === "string" ? (body.relationshipStatus as CreateContactInput["relationshipStatus"]) : undefined,
      pipelineStage: typeof body.pipelineStage === "string" ? (body.pipelineStage as CreateContactInput["pipelineStage"]) : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    },
    validationErrors: {},
  };
}

export function profileFromContact(contact: CrmContact): CrmContactProfile {
  return contactToProfile(contact);
}
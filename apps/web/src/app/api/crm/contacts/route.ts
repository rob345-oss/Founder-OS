import type { NextRequest } from "next/server";

import {
  createContactInputFromForm,
  type ContactFormInput,
  type ContactTypeOption,
  type LifecycleOption,
} from "@/lib/crm/contact-form";
import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { createContact, listContacts } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

function bodyToContactForm(body: Record<string, unknown>): ContactFormInput {
  return {
    firstName: typeof body.firstName === "string" ? body.firstName : undefined,
    lastName: typeof body.lastName === "string" ? body.lastName : undefined,
    fullName: typeof body.fullName === "string" ? body.fullName : undefined,
    primaryEmail: typeof body.primaryEmail === "string" ? body.primaryEmail : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    countryCode: typeof body.countryCode === "string" ? body.countryCode : undefined,
    organization: typeof body.organization === "string" ? body.organization : undefined,
    contactType: (typeof body.contactType === "string"
      ? body.contactType
      : Array.isArray(body.classifications)
        ? String(body.classifications[0])
        : "general_contact") as ContactTypeOption,
    lifecycle: (typeof body.lifecycle === "string" ? body.lifecycle : "new_lead") as LifecycleOption,
    leadSource:
      typeof body.leadSource === "string"
        ? body.leadSource
        : typeof body.contactSource === "string"
          ? body.contactSource
          : "manual",
    tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    marketingConsent:
      typeof body.marketingConsent === "boolean" ? body.marketingConsent : body.marketingConsent === null ? null : undefined,
    preferredChannel:
      body.preferredChannel === "email" || body.preferredChannel === "phone" || body.preferredChannel === "sms"
        ? body.preferredChannel
        : undefined,
    doNotContact: body.doNotContact === true,
    preferenceNotes: typeof body.preferenceNotes === "string" ? body.preferenceNotes : undefined,
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const result = await listContacts({
    q: sp.get("q") ?? undefined,
    classification: sp.get("classification") ?? undefined,
    relationshipStatus: sp.get("relationshipStatus") ?? undefined,
    pipelineStage: sp.get("pipelineStage") ?? undefined,
    tag: sp.get("tag") ?? undefined,
    source: sp.get("source") ?? undefined,
    archived: sp.get("archived") === "1",
    sort: (sp.get("sort") as "date_added" | "last_interaction" | "next_follow_up") ?? "date_added",
    direction: sp.get("direction") === "asc" ? "asc" : "desc",
    limit: Number(sp.get("limit") ?? "50"),
    offset: Number(sp.get("offset") ?? "0"),
  });
  return Response.json(result);
}

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const body = (await req.json()) as Record<string, unknown>;
  const form = bodyToContactForm(body);
  const mapped = createContactInputFromForm(form);
  if (!mapped.input) {
    return Response.json({ error: "Validation failed", fieldErrors: mapped.validation.fieldErrors }, { status: 422 });
  }

  const result = await createContact(mapped.input, guard.principal.userId);
  if (!result.ok) {
    return Response.json({ error: "Duplicate contact", duplicates: result.duplicates }, { status: 409 });
  }
  return Response.json(result.contact, { status: 201 });
}
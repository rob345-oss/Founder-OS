import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { runCrmDataHandler } from "@/lib/crm/server/crm-route";
import { createContact, listContacts } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  return runCrmDataHandler(async () => {
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
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const body = (await req.json()) as Record<string, unknown>;
  if (typeof body.primaryEmail !== "string" || !body.primaryEmail.includes("@")) {
    return Response.json({ error: "primaryEmail is required" }, { status: 422 });
  }
  const primaryEmail = body.primaryEmail;
  return runCrmDataHandler(async () => {
    const contact = await createContact(
      {
        fullName: typeof body.fullName === "string" ? body.fullName : "",
        primaryEmail,
        additionalEmails: Array.isArray(body.additionalEmails) ? body.additionalEmails.map(String) : [],
        phone: typeof body.phone === "string" ? body.phone : null,
        countryCode: typeof body.countryCode === "string" ? body.countryCode : null,
        organization: typeof body.organization === "string" ? body.organization : null,
        contactSource: typeof body.contactSource === "string" ? body.contactSource : "manual",
        classifications: Array.isArray(body.classifications) ? (body.classifications as never[]) : undefined,
        relationshipStatus: typeof body.relationshipStatus === "string" ? (body.relationshipStatus as never) : undefined,
        pipelineStage: typeof body.pipelineStage === "string" ? (body.pipelineStage as never) : undefined,
        tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      },
      guard.principal.userId,
    );
    return Response.json(contact, { status: 201 });
  });
}
import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { parseContactWriteBody } from "@/lib/crm/server/contact-payload";
import { addNote, createContact, listContacts } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

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
  const parsed = parseContactWriteBody(body);
  if (Object.keys(parsed.validationErrors).length) {
    return Response.json({ error: "Validation failed", fields: parsed.validationErrors }, { status: 422 });
  }
  if (!parsed.input.primaryEmail) {
    return Response.json({ error: "primaryEmail is required" }, { status: 422 });
  }
  const contact = await createContact(parsed.input, guard.principal.userId);
  if (parsed.initialNote) {
    await addNote(contact.id, guard.principal.userId, parsed.initialNote);
  }
  return Response.json(contact, { status: 201 });
}

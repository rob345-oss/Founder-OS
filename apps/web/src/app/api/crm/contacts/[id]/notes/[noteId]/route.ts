import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { CRM_NOTE_CATEGORIES } from "@/lib/crm/types";
import { deleteNote, getContact, patchNote } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id, noteId } = await ctx.params;
  const contact = await getContact(id);
  if (!contact) return Response.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as { body?: string; category?: string; pinned?: boolean };
  if (body.category && !CRM_NOTE_CATEGORIES.includes(body.category as (typeof CRM_NOTE_CATEGORIES)[number])) {
    return Response.json({ error: "Invalid category" }, { status: 422 });
  }

  const note = await patchNote(noteId, guard.principal.userId, {
    body: typeof body.body === "string" ? body.body : undefined,
    category: body.category as (typeof CRM_NOTE_CATEGORIES)[number] | undefined,
    pinned: typeof body.pinned === "boolean" ? body.pinned : undefined,
  });
  if (!note || note.contactId !== id) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(note);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id, noteId } = await ctx.params;
  const contact = await getContact(id);
  if (!contact) return Response.json({ error: "Not found" }, { status: 404 });
  const ok = await deleteNote(noteId, guard.principal.userId);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
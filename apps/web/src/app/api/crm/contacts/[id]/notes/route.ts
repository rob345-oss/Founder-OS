import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import type { CrmNoteCategory } from "@/lib/crm/types";
import { CRM_NOTE_CATEGORIES } from "@/lib/crm/types";
import { addNote, getContact } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const contact = await getContact(id);
  if (!contact) return Response.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as { body?: string; category?: string; pinned?: boolean };
  if (!body.body?.trim()) return Response.json({ error: "body is required" }, { status: 422 });
  const category =
    body.category && CRM_NOTE_CATEGORIES.includes(body.category as CrmNoteCategory)
      ? (body.category as CrmNoteCategory)
      : undefined;
  const note = await addNote(id, guard.principal.userId, body.body, { category, pinned: body.pinned });
  return Response.json(note, { status: 201 });
}

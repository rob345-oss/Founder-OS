import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { runCrmDataHandler } from "@/lib/crm/server/crm-route";
import { addNote, getContact } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as { body?: string };
  if (!body.body?.trim()) return Response.json({ error: "body is required" }, { status: 422 });
  return runCrmDataHandler(async () => {
    const contact = await getContact(id);
    if (!contact) return Response.json({ error: "Not found" }, { status: 404 });
    const note = await addNote(id, guard.principal.userId, body.body!);
    return Response.json(note, { status: 201 });
  });
}
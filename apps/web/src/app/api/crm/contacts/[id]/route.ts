import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { parseContactWriteBody } from "@/lib/crm/server/contact-payload";
import {
  getContact,
  listActivities,
  listEmails,
  listFollowUps,
  listNotes,
  updateContact,
} from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const contact = await getContact(id);
  if (!contact) return Response.json({ error: "Not found" }, { status: 404 });
  const [notes, activities, emails, followUpsAll] = await Promise.all([
    listNotes(id),
    listActivities(id),
    listEmails(id),
    listFollowUps(),
  ]);
  const followUps = followUpsAll.filter((f) => f.contactId === id);
  return Response.json({ contact, notes, activities, emails, followUps });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const existing = await getContact(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const parsed = parseContactWriteBody(body, existing);
  if (Object.keys(parsed.validationErrors).length) {
    return Response.json({ error: "Validation failed", fields: parsed.validationErrors }, { status: 422 });
  }

  const patch = parsed.input;
  const updated = await updateContact(
    id,
    {
      ...patch,
      clearPhone: patch.phone === null,
    },
    guard.principal.userId,
  );
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}

import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
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
  const body = (await req.json()) as Record<string, unknown>;
  const updated = await updateContact(
    id,
    {
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
      primaryEmail: typeof body.primaryEmail === "string" ? body.primaryEmail : undefined,
      phone: body.phone === null ? null : typeof body.phone === "string" ? body.phone : undefined,
      organization: typeof body.organization === "string" ? body.organization : undefined,
      classifications: Array.isArray(body.classifications) ? (body.classifications as never[]) : undefined,
      relationshipStatus: typeof body.relationshipStatus === "string" ? (body.relationshipStatus as never) : undefined,
      pipelineStage: typeof body.pipelineStage === "string" ? (body.pipelineStage as never) : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    },
    guard.principal.userId,
  );
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(updated);
}

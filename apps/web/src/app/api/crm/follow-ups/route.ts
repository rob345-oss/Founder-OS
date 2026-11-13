import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { createFollowUp, listFollowUps } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const items = await listFollowUps(status ? { status } : undefined);
  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as {
    contactId?: string;
    title?: string;
    description?: string;
    dueAt?: string;
    priority?: string;
  };
  if (!body.contactId || !body.title || !body.dueAt) {
    return Response.json({ error: "contactId, title, and dueAt are required" }, { status: 422 });
  }
  const followUp = await createFollowUp({
    contactId: body.contactId,
    title: body.title,
    description: body.description,
    dueAt: body.dueAt,
    priority: body.priority as never,
    actorUserId: guard.principal.userId,
  });
  return Response.json(followUp, { status: 201 });
}

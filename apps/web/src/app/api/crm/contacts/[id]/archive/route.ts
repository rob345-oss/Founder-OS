import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { archiveContact } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const archived = await archiveContact(id, guard.principal.userId);
  if (!archived) return Response.json({ error: "Not found or already archived" }, { status: 404 });
  return Response.json({ ok: true, id });
}
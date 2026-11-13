import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { completeFollowUp } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const followUp = await completeFollowUp(id, guard.principal.userId);
  if (!followUp) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(followUp);
}

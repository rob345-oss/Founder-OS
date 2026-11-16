import type { NextRequest } from "next/server";

import type { AudienceFilter } from "@/lib/crm/email/types";
import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { listEmailSegments, saveEmailSegment } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return Response.json({ items: await listEmailSegments() });
}

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as { id?: string; name?: string; description?: string; filter?: AudienceFilter };
  if (!body.name?.trim()) return Response.json({ error: "name required" }, { status: 400 });
  const segment = await saveEmailSegment({
    id: body.id,
    name: body.name,
    description: body.description,
    filter: body.filter ?? {},
    actorUserId: guard.principal.userId,
  });
  return Response.json({ segment });
}
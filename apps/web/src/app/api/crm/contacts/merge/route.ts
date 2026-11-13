import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { mergeContacts } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as { primaryId?: string; secondaryId?: string };
  if (!body.primaryId || !body.secondaryId) {
    return Response.json({ error: "primaryId and secondaryId are required" }, { status: 422 });
  }
  const contact = await mergeContacts(body.primaryId, body.secondaryId, guard.principal.userId);
  if (!contact) return Response.json({ error: "Merge failed" }, { status: 404 });
  return Response.json(contact);
}

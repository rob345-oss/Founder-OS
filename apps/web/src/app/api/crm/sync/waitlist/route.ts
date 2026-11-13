import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { syncWaitlistFromTg } from "@/lib/crm/server/sync-waitlist";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const result = await syncWaitlistFromTg(guard.bearer);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status === 401 ? 401 : 502 });
  }
  return Response.json({ upserted: result.upserted, created: result.created, leadCount: result.leadCount });
}

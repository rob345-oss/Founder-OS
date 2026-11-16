import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { runWaitlistBackfill } from "@/lib/crm/server/waitlist-backfill";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const dryRun = body.dryRun !== false;

  try {
    const result = await runWaitlistBackfill(guard.bearer, { dryRun });
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Backfill failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
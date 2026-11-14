import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { runCrmDataHandler } from "@/lib/crm/server/crm-route";
import { getDashboardMetrics } from "@/lib/crm/server/repository";
import { syncWaitlistFromTg } from "@/lib/crm/server/sync-waitlist";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  return runCrmDataHandler(async () => {
    if (req.nextUrl.searchParams.get("sync") === "1") {
      const sync = await syncWaitlistFromTg(guard.bearer);
      if (!sync.ok) {
        return Response.json({ error: "Waitlist sync failed", detail: sync.error }, { status: sync.status === 401 ? 401 : 502 });
      }
    }

    const metrics = await getDashboardMetrics();
    return Response.json(metrics);
  });
}
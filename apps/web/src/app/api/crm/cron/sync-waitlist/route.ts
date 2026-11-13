import type { NextRequest } from "next/server";

import { getCrmConfig } from "@/lib/crm/config";
import { resolveAutomatedSyncBearer, runAutomatedWaitlistSync } from "@/lib/crm/server/sync-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const cfg = getCrmConfig();
  const secret = cfg.cronSecret ?? process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "CRM_CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(authHeader)?.[1]?.trim();
  const headerSecret = req.headers.get("x-crm-cron-secret")?.trim();
  if (bearer !== secret && headerSecret !== secret) {
    return unauthorized();
  }

  const syncBearer = resolveAutomatedSyncBearer();
  if (!syncBearer) {
    return Response.json(
      { error: "CRM_TG_SYNC_BEARER_TOKEN (or TITANIUM_GUARDIAN_STAGING_BEARER_TOKEN) not configured" },
      { status: 503 },
    );
  }

  const result = await runAutomatedWaitlistSync(syncBearer);
  if (!result.ok) {
    return Response.json({ error: result.error, runId: result.runId }, { status: result.status === 401 ? 401 : 502 });
  }
  return Response.json({
    upserted: result.upserted,
    created: result.created,
    leadCount: result.leadCount,
    runId: result.runId,
  });
}

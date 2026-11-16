import type { NextRequest } from "next/server";

import { getCrmConfig } from "@/lib/crm/config";
import { dispatchDueSendJobs } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

function authorizeCron(req: NextRequest): boolean {
  const cfg = getCrmConfig();
  const expected = cfg.cronSecret;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  return bearer.length > 0 && bearer === expected;
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const syncBearer = getCrmConfig().tgSyncBearer;
  if (!syncBearer) return Response.json({ error: "CRM_TG_SYNC_BEARER_TOKEN not configured" }, { status: 503 });
  const result = await dispatchDueSendJobs(syncBearer, 40);
  return Response.json(result);
}
import type { NextRequest } from "next/server";

import { CRM_PIPELINE_STAGES } from "@/lib/crm/types";
import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { runCrmDataHandler } from "@/lib/crm/server/crm-route";
import { listContacts } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return runCrmDataHandler(async () => {
    const result = await listContacts({ limit: 500, sort: "last_interaction", direction: "desc" });
    return Response.json({ items: result.items, stages: CRM_PIPELINE_STAGES });
  });
}
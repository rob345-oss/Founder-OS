import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { collectMarketingIntegrations } from "@/lib/marketing/server/integrations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return Response.json({ items: collectMarketingIntegrations() });
}

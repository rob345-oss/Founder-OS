import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { runMarketingDataHandler } from "@/lib/marketing/server/marketing-route";
import { collectMarketingIntegrations } from "@/lib/marketing/server/integrations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return runMarketingDataHandler(async () => Response.json({ items: collectMarketingIntegrations() }));
}
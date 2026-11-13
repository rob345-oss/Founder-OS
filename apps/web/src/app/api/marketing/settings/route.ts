import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { getMarketingSettings } from "@/lib/marketing/server/repository";
import { collectMarketingIntegrations, integrationsSummary } from "@/lib/marketing/server/integrations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const settings = await getMarketingSettings();
  const integrations = collectMarketingIntegrations();
  return Response.json({
    ...settings,
    integrationHealth: integrationsSummary(integrations),
    integrations,
  });
}

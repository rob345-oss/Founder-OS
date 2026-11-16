import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { getEmailOverviewMetrics } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const periodDays = Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30;
  const metrics = await getEmailOverviewMetrics(periodDays);
  return Response.json({ metrics });
}
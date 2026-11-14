import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { runMarketingDataHandler } from "@/lib/marketing/server/marketing-route";
import { buildMarketingOverview } from "@/lib/marketing/server/overview";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  return runMarketingDataHandler(async () => {
    const overview = await buildMarketingOverview({
      preset: sp.get("preset"),
      start: sp.get("start"),
      end: sp.get("end"),
    });
    return Response.json(overview);
  });
}
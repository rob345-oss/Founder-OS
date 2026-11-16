import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { getEmailCampaign } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const campaign = await getEmailCampaign(id);
  if (!campaign) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ campaign });
}
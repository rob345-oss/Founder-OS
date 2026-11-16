import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { cancelEmailCampaign, writeEmailAuditLog } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  await cancelEmailCampaign(id);
  await writeEmailAuditLog({
    actorUserId: guard.principal.userId,
    actorEmail: guard.principal.email,
    action: "campaign_cancel",
    entityType: "campaign",
    entityId: id,
  });
  return Response.json({ ok: true });
}
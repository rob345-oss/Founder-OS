import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { enqueueCampaignSendJobs, scheduleEmailCampaign, writeEmailAuditLog } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as { scheduledAt?: string; confirmed?: boolean };
  if (!body.confirmed) return Response.json({ error: "Explicit confirmation required." }, { status: 400 });
  if (!body.scheduledAt) return Response.json({ error: "scheduledAt required" }, { status: 400 });

  const campaign = await scheduleEmailCampaign(id, body.scheduledAt);
  const jobs = await enqueueCampaignSendJobs(id, body.scheduledAt);

  await writeEmailAuditLog({
    actorUserId: guard.principal.userId,
    actorEmail: guard.principal.email,
    action: "campaign_schedule",
    entityType: "campaign",
    entityId: id,
    details: { scheduledAt: body.scheduledAt, jobs },
  });

  return Response.json({ campaign, jobsEnqueued: jobs });
}
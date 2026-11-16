import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { dispatchDueSendJobs, enqueueCampaignSendJobs, writeEmailAuditLog } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as { confirmed?: boolean };
  if (!body.confirmed) return Response.json({ error: "Explicit confirmation required." }, { status: 400 });

  const jobs = await enqueueCampaignSendJobs(id, null);
  const dispatch = await dispatchDueSendJobs(guard.bearer, 50);

  await writeEmailAuditLog({
    actorUserId: guard.principal.userId,
    actorEmail: guard.principal.email,
    action: "campaign_send_now",
    entityType: "campaign",
    entityId: id,
    details: { jobs, dispatch },
  });

  return Response.json({ jobsEnqueued: jobs, dispatch });
}
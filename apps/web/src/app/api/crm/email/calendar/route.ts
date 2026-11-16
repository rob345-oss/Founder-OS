import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { listEmailCampaigns } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const items = (await listEmailCampaigns()).filter((c) => c.scheduledAt || c.status !== "draft");
  return Response.json({
    items: items.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      scheduledAt: c.scheduledAt,
      scheduledTimezone: c.scheduledTimezone,
      estimatedRecipients: c.estimatedRecipients,
      labelIds: c.labelIds,
    })),
  });
}
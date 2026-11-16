import type { NextRequest } from "next/server";

import type { AudienceFilter, CommunicationType } from "@/lib/crm/email/types";
import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { listEmailCampaigns, saveEmailCampaign, writeEmailAuditLog } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return Response.json({ items: await listEmailCampaigns() });
}

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") return Response.json({ error: "name required" }, { status: 400 });

  const campaign = await saveEmailCampaign({
    id: typeof body.id === "string" ? body.id : undefined,
    name: body.name,
    description: typeof body.description === "string" ? body.description : "",
    internalNotes: typeof body.internalNotes === "string" ? body.internalNotes : "",
    communicationType: (body.communicationType === "transactional" ? "transactional" : "promotional") as CommunicationType,
    templateId: typeof body.templateId === "string" ? body.templateId : null,
    templateVersionId: typeof body.templateVersionId === "string" ? body.templateVersionId : null,
    subject: typeof body.subject === "string" ? body.subject : "",
    previewText: typeof body.previewText === "string" ? body.previewText : "",
    fromName: typeof body.fromName === "string" ? body.fromName : "Titanium Guardian",
    fromAddress: typeof body.fromAddress === "string" ? body.fromAddress : null,
    audienceFilter: (body.audienceFilter ?? {}) as AudienceFilter,
    excludedContactIds: Array.isArray(body.excludedContactIds) ? body.excludedContactIds.map(String) : [],
    labelIds: Array.isArray(body.labelIds) ? body.labelIds.map(String) : [],
    scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : null,
    scheduledTimezone: typeof body.scheduledTimezone === "string" ? body.scheduledTimezone : "UTC",
    actorUserId: guard.principal.userId,
  });

  await writeEmailAuditLog({
    actorUserId: guard.principal.userId,
    actorEmail: guard.principal.email,
    action: "campaign_save",
    entityType: "campaign",
    entityId: campaign.id,
  });

  return Response.json({ campaign });
}
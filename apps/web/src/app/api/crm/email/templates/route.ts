import type { NextRequest } from "next/server";

import type { CommunicationType, EmailLocale } from "@/lib/crm/email/types";
import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { listEmailTemplates, saveEmailTemplate, writeEmailAuditLog } from "@/lib/crm/server/email-campaign-store";
import { parseBlocks } from "@/lib/crm/email/blocks";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  return Response.json({ items: await listEmailTemplates(status ?? undefined) });
}

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") return Response.json({ error: "name required" }, { status: 400 });

  const saved = await saveEmailTemplate({
    id: typeof body.id === "string" ? body.id : undefined,
    name: body.name,
    description: typeof body.description === "string" ? body.description : "",
    locale: (body.locale === "es" ? "es" : "en") as EmailLocale,
    communicationType: (body.communicationType === "transactional" ? "transactional" : "promotional") as CommunicationType,
    fromName: typeof body.fromName === "string" ? body.fromName : "Titanium Guardian",
    fromAddress: typeof body.fromAddress === "string" ? body.fromAddress : null,
    subject: typeof body.subject === "string" ? body.subject : "",
    previewText: typeof body.previewText === "string" ? body.previewText : "",
    blocks: parseBlocks(body.blocks),
    labelIds: Array.isArray(body.labelIds) ? body.labelIds.map(String) : [],
    actorUserId: guard.principal.userId,
  });

  await writeEmailAuditLog({
    actorUserId: guard.principal.userId,
    actorEmail: guard.principal.email,
    action: "template_save",
    entityType: "template",
    entityId: saved.template.id,
    details: { versionId: saved.version.id },
  });

  return Response.json(saved);
}
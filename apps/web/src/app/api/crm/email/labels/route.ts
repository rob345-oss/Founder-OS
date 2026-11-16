import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { createEmailLabel, listEmailLabels, writeEmailAuditLog } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return Response.json({ items: await listEmailLabels() });
}

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as { name?: string; color?: string };
  if (!body.name?.trim()) return Response.json({ error: "name required" }, { status: 400 });
  const label = await createEmailLabel({ name: body.name, color: body.color });
  await writeEmailAuditLog({
    actorUserId: guard.principal.userId,
    actorEmail: guard.principal.email,
    action: "label_create",
    entityType: "label",
    entityId: label.id,
  });
  return Response.json({ label });
}
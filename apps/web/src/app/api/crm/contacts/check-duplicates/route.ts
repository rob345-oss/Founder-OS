import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { findContactDuplicates } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const body = (await req.json()) as Record<string, unknown>;
  const duplicates = await findContactDuplicates({
    primaryEmail: typeof body.primaryEmail === "string" ? body.primaryEmail : undefined,
    tgLeadId: typeof body.tgLeadId === "string" ? body.tgLeadId : null,
    phone: typeof body.phone === "string" ? body.phone : null,
    excludeContactId: typeof body.excludeContactId === "string" ? body.excludeContactId : undefined,
  });

  return Response.json({ duplicates });
}
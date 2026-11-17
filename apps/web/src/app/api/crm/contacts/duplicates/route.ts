import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { findContactDuplicates } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;

  const sp = req.nextUrl.searchParams;
  const items = await findContactDuplicates({
    email: sp.get("email") ?? undefined,
    phoneE164: sp.get("phoneE164") ?? undefined,
    excludeId: sp.get("excludeId") ?? undefined,
  });
  return Response.json({ items });
}
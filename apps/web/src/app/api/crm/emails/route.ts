import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { runCrmDataHandler } from "@/lib/crm/server/crm-route";
import { listEmails } from "@/lib/crm/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const contactId = req.nextUrl.searchParams.get("contactId") ?? undefined;
  return runCrmDataHandler(async () => {
    const items = await listEmails(contactId ?? undefined, 200);
    return Response.json({ items });
  });
}
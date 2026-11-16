import type { NextRequest } from "next/server";

import { requireCrmSuperAdmin } from "@/lib/crm/guard";
import { createTestSendJob } from "@/lib/crm/server/email-campaign-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireCrmSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as { toAddress?: string };
  if (!body.toAddress?.trim()) return Response.json({ error: "toAddress required" }, { status: 400 });

  try {
    const result = await createTestSendJob({
      campaignId: id,
      toAddress: body.toAddress.trim(),
      bearer: guard.bearer,
      actorUserId: guard.principal.userId,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "test_send_failed" }, { status: 400 });
  }
}
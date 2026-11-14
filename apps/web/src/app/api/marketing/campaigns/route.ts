import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { runMarketingDataHandler } from "@/lib/marketing/server/marketing-route";
import { createCampaign, listCampaigns } from "@/lib/marketing/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  return runMarketingDataHandler(async () => {
    const items = await listCampaigns();
    return Response.json({ items });
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  return runMarketingDataHandler(async () => {
    const created = await createCampaign({
      name: body.name as string,
      description: typeof body.description === "string" ? body.description : null,
      objective: typeof body.objective === "string" ? body.objective : null,
      channel: typeof body.channel === "string" ? body.channel : null,
      status: typeof body.status === "string" ? (body.status as "draft") : undefined,
    });
    return Response.json(created, { status: 201 });
  });
}
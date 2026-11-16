import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { recordManualPostMetrics } from "@/lib/marketing/server/social-repository";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;
  const num = (k: string) => (typeof body[k] === "number" ? body[k] : body[k] == null ? null : Number(body[k]));

  try {
    const metrics = await recordManualPostMetrics(id, {
      impressions: num("impressions"),
      reach: num("reach"),
      likes: num("likes"),
      comments: num("comments"),
      shares: num("shares"),
      saves: num("saves"),
      clicks: num("clicks"),
      videoViews: num("videoViews"),
      profileVisits: num("profileVisits"),
      websiteClicks: num("websiteClicks"),
      notes: typeof body.notes === "string" ? body.notes : null,
    });
    return Response.json(metrics, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed to save metrics" }, { status: 400 });
  }
}
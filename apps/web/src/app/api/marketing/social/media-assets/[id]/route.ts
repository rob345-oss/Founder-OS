import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import {
  deleteSocialMediaAsset,
  getSocialMediaAsset,
  updateSocialMediaAsset,
} from "@/lib/marketing/server/social-media-repository";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const withUsage = req.nextUrl.searchParams.get("usage") === "1";
  const asset = await getSocialMediaAsset(id, withUsage);
  if (!asset) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(asset);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;
  try {
    const updated = await updateSocialMediaAsset(id, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: typeof body.description === "string" ? body.description : body.description === null ? null : undefined,
      altText: typeof body.altText === "string" ? body.altText : body.altText === null ? null : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      archivedAt:
        body.archivedAt === null
          ? null
          : typeof body.archivedAt === "string"
            ? body.archivedAt
            : body.archive === true
              ? new Date().toISOString()
              : undefined,
    });
    return Response.json(updated);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const force = req.nextUrl.searchParams.get("force") === "1";
  try {
    await deleteSocialMediaAsset(id, force);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Delete failed" }, { status: 400 });
  }
}
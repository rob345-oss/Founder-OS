import type { NextRequest } from "next/server";

import { requireMarketingSuperAdmin } from "@/lib/marketing/guard";
import { getSocialMediaAsset } from "@/lib/marketing/server/social-media-repository";
import { readMarketingMediaObject } from "@/lib/marketing/server/social-media-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const guard = await requireMarketingSuperAdmin(req);
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const asset = await getSocialMediaAsset(id);
  if (!asset || !asset.storageKey) return Response.json({ error: "Not found" }, { status: 404 });
  if (asset.archivedAt) return Response.json({ error: "Archived" }, { status: 410 });

  try {
    const { data, mimeType } = await readMarketingMediaObject(asset.storageKey);
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mimeType ?? asset.mimeType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Read failed" }, { status: 404 });
  }
}